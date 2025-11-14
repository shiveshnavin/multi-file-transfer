// list-and-download-nginx.js
// Pure Node.js (CommonJS) — no external dependencies

const http = require('http');
const https = require('https');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// ---------- HTTP fetch + HTML parsing ----------

function fetchPage(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const getter = url.startsWith('https') ? https.get : http.get;
    const req = getter(url, { headers }, (res) => {
      if (res.statusCode && res.statusCode >= 400) {
        reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        res.resume();
        return;
      }
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
  });
}

function extractLinks(html) {
  const re = /<a\s+href="([^"]+)"/gi;
  const out = [];
  let m;
  while ((m = re.exec(html))) {
    const href = m[1];
    if (href && href !== '../') out.push(href);
  }
  return out;
}

// ---------- Crawl recursively ----------

async function crawl(baseUrl, pathRel = '', headers = {}, results = []) {
  const posixJoin = (...parts) => parts.filter(Boolean).join('/').replace(/\/+/g, '/');
  const pageUrl = new URL(pathRel, baseUrl).href;
  const html = await fetchPage(pageUrl, headers);
  const links = extractLinks(html);

  for (const href of links) {
    if (href.endsWith('/')) {
      const nextRel = posixJoin(pathRel, href);
      await crawl(baseUrl, nextRel, headers, results);
    } else {
      const fileUrl = new URL(href, pageUrl).href;
      const relPath = posixJoin(pathRel, href);
      results.push({ url: fileUrl, relPath });
    }
  }
  return results;
}

// ---------- Helpers for curl download ----------
function headContentLength(url, headers = {}, maxRedirects = 5) {
  return new Promise((resolve, reject) => {
    const doHead = (u, redirects) => {
      const mod = u.startsWith('https') ? https : http;
      const req = mod.request(u, { method: 'HEAD', headers }, (res) => {
        // follow redirects
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location && redirects > 0) {
          const next = new URL(res.headers.location, u).href;
          res.resume();
          return doHead(next, redirects - 1);
        }
        if (res.statusCode >= 400) {
          res.resume();
          return resolve(null); // don’t fail; just no size
        }
        const len = res.headers['content-length'] ? Number(res.headers['content-length']) : null;
        res.resume();
        resolve(len && !Number.isNaN(len) ? len : null);
      });
      req.on('error', () => resolve(null));
      req.end();
    };
    doHead(url, maxRedirects);
  });
}
function buildCookie(headers = {}) {
  if (headers.Cookie && typeof headers.Cookie === 'string') return headers.Cookie;
  if (headers.cookies && typeof headers.cookies === 'object') {
    return Object.entries(headers.cookies)
      .map(([k, v]) => `${k}=${String(v).replace(/^"+|"+$/g, '')}`)
      .join('; ');
  }
  return '';
}

function spawnPromise(cmd, args, options = {}) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: 'inherit', ...options });
    p.on('error', reject);
    p.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} exited ${code}`))));
  });
}

/**
 * Download list of {url, relPath} with curl + progress
 */
async function downloadFiles(items, headers = {}, targetDir = '.', parallel = 5) {
  if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

  const cookieValue =
    headers.Cookie && typeof headers.Cookie === 'string'
      ? headers.Cookie
      : (headers.cookies && typeof headers.cookies === 'object'
          ? Object.entries(headers.cookies).map(([k, v]) => `${k}=${String(v).replace(/^"+|"+$/g, '')}`).join('; ')
          : '');

  const headerArgs = cookieValue ? ['-H', `Cookie: ${cookieValue}`] : [];

  const human = (n) => {
    if (n == null) return '?';
    const u = ['B','KB','MB','GB','TB'];
    let i = 0, x = n;
    while (x >= 1024 && i < u.length - 1) { x /= 1024; i++; }
    return `${x.toFixed(1)} ${u[i]}`;
  };

  const runOne = async (item) => {
    const outDir = path.join(targetDir, path.dirname(item.relPath));
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    const outFile = path.join(targetDir, item.relPath);

    // total size (may be null)
    const total = await headContentLength(item.url, cookieValue ? { Cookie: cookieValue } : {});

    // ensure parent exists (already done), compute starting size if resuming
    let lastPrintedPct = -1;
    let stop = false;

    const args = [
      '-f', '-L',
      '--retry', '3', '--retry-delay', '1',
      '-C', '-',            // resume
      ...headerArgs,
      '-o', outFile,
      item.url
    ];

    console.log(`\n→ ${item.relPath}`);
    const child = spawn('curl', args, { stdio: ['ignore', 'ignore', 'ignore'] });

    // progress poller (every 500ms)
    const iv = setInterval(() => {
      if (stop) return;
      fs.stat(outFile, (err, st) => {
        if (err || !st || total == null) {
          if (!err && st) {
            // unknown total; show bytes downloaded
            process.stdout.write(`   ${human(st.size)} downloaded\r`);
          }
          return;
        }
        const pct = Math.max(0, Math.min(100, (st.size / total) * 100));
        const pctRounded = Math.floor(pct);
        if (pctRounded !== lastPrintedPct) {
          lastPrintedPct = pctRounded;
          process.stdout.write(`   ${pctRounded}% (${human(st.size)} / ${human(total)})\r`);
        }
      });
    }, 500);

    // await completion
    await new Promise((resolve, reject) => {
      child.on('error', reject);
      child.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`curl exited ${code}`))));
    }).catch((e) => {
      clearInterval(iv);
      stop = true;
      process.stdout.write('\n');
      throw e;
    });

    clearInterval(iv);
    stop = true;

    // final line
    try {
      const st = fs.statSync(outFile);
      if (total) {
        console.log(`   100% (${human(st.size)} / ${human(total)})`);
      } else {
        console.log(`   Done (${human(st.size)} downloaded)`);
      }
    } catch {
      console.log('   Done');
    }
  };

  let i = 0;
  const workers = Array.from({ length: Math.min(parallel, items.length) }, async () => {
    while (true) {
      const idx = i++;
      if (idx >= items.length) break;
      try {
        await runOne(items[idx]);
      } catch (e) {
        console.error(`Failed: ${items[idx].url} (${e.message})`);
      }
    }
  });

  await Promise.all(workers);
}

// ---------- Example usage ----------


// Example usage:
const BASE_URL = 'https://8080-cs-563454650358-default.cs-asia-southeast1-kelp.cloudshell.dev/transport/files/'; // change to your nginx base URL
const HEADERS = {
  'Cookie': 'CloudShellAuthorization="Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL3NoZWxsLmNsb3VkLmdvb2dsZS5jb20iLCJhdWQiOiJ1c2Vycy9zaGl2ZXNobmF2aW5AZ21haWwuY29tL2Vudmlyb25tZW50cy9kZWZhdWx0Iiwic3ViIjoic2hpdmVzaG5hdmluQGdtYWlsLmNvbSIsImlhdCI6MTc2MzAyNjI4MiwiZXhwIjoxNzYzMTEyNjc2fQ.fm6DtMZV42_ZkNz5hq5NAMefpzdKNJ5B_D-6uhmYL_-thFL4kHLzefLEc5IprzRnqC02wUvoHXoJ2hj1Rsbiosqvvnt8oH1l9pJDaDtvsuiBXBgWypHZxT3XOsZ6j8EORPC8EC2_unTr3NsQHzdxnHwXyQrFJ9VbexRkJGTbhbulBFJmuQhNjJX-5C8KNpHUoaPomREb7sDEcytP75vZMkNe2W9mV7rI5vuoJB_6cjhiaEt997QZZCa-7fgP0daxDdQXjPxr0BlB952eDaopCTXXPejgF_6wWJ40_BsAwpfe9wRk4GUqYFTM2feOLeuPjQ9xBBjZa5sx4TPhcoJ4pw"; CloudShellPartitionedAuthorization="Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL3NoZWxsLmNsb3VkLmdvb2dsZS5jb20iLCJhdWQiOiJ1c2Vycy9zaGl2ZXNobmF2aW5AZ21haWwuY29tL2Vudmlyb25tZW50cy9kZWZhdWx0Iiwic3ViIjoic2hpdmVzaG5hdmluQGdtYWlsLmNvbSIsImlhdCI6MTc2MzAyNjI4MiwiZXhwIjoxNzYzMTEyNjc2fQ.fm6DtMZV42_ZkNz5hq5NAMefpzdKNJ5B_D-6uhmYL_-thFL4kHLzefLEc5IprzRnqC02wUvoHXoJ2hj1Rsbiosqvvnt8oH1l9pJDaDtvsuiBXBgWypHZxT3XOsZ6j8EORPC8EC2_unTr3NsQHzdxnHwXyQrFJ9VbexRkJGTbhbulBFJmuQhNjJX-5C8KNpHUoaPomREb7sDEcytP75vZMkNe2W9mV7rI5vuoJB_6cjhiaEt997QZZCa-7fgP0daxDdQXjPxr0BlB952eDaopCTXXPejgF_6wWJ40_BsAwpfe9wRk4GUqYFTM2feOLeuPjQ9xBBjZa5sx4TPhcoJ4pw";'
};


const TARGET_DIR = './downloads';
const PARALLEL = 5;

// (async () => {
//   try {
//     const items = await crawl(BASE_URL, '', HEADERS);
//     console.log(`Found ${items.length} files.`);
//     await downloadFiles(items, HEADERS, TARGET_DIR, PARALLEL);
//     console.log('Done.');
//   } catch (err) {
//     console.error(err);
//   }
// })();
 

(async () => {
  try {
    const items = [{
        relPath:'wan/diffusion_pytorch_model-00003-of-00003.safetensors',
        url:'https://8080-cs-563454650358-default.cs-asia-southeast1-kelp.cloudshell.dev/transport/files/Wan2.2-TI2V-5B/diffusion_pytorch_model-00002-of-00003.safetensors'
    }]
    console.log(`Found ${items.length} files.`);
    await downloadFiles(items, HEADERS, TARGET_DIR, PARALLEL);
    console.log('Done.');
  } catch (err) {
    console.error(err);
  }
})();
 
