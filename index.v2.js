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
 * Download list of {url, relPath} with curl
 */
async function downloadFiles(items, headers = {}, targetDir = '.', parallel = 5) {
  if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

  const cookieValue = buildCookie(headers);
  const headerArgs = cookieValue ? ['-H', `Cookie: ${cookieValue}`] : [];

  const runOne = async (item) => {
    const outDir = path.join(targetDir, path.dirname(item.relPath));
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    const outFile = path.join(targetDir, item.relPath);

    const args = [
      '-f', '-L', '-sS',
      '--retry', '3', '--retry-delay', '1',
      '-C', '-',                // resume
      ...headerArgs,
      '-o', outFile,
      item.url
    ];

    console.log(`Downloading ${item.url} -> ${outFile}`);
    await spawnPromise('curl', args);
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
const BASE_URL = 'https://8080-cs-563454650358-default.cs-asia-southeast1-kelp.cloudshell.dev/files'; // change to your nginx base URL
const HEADERS = {
  'Cookie': 'CloudShellAuthorization="Bearer ..-6uhmYL_---"; CloudShellPartitionedAuthorization="Bearer ..-6uhmYL_---"'
};


const TARGET_DIR = './downloads';
const PARALLEL = 5;

(async () => {
  try {
    const items = await crawl(BASE_URL, '', HEADERS);
    console.log(`Found ${items.length} files.`);
    await downloadFiles(items, HEADERS, TARGET_DIR, PARALLEL);
    console.log('Done.');
  } catch (err) {
    console.error(err);
  }
})();
 
