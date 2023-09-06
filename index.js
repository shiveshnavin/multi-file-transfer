const EasyDl = require("easydl");
const path = require('path')
const fs = require('fs')
const crypto = require('crypto');

let downloads = [
    ...["https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0/resolve/main/vae_decoder/model.onnx",
        "https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0/resolve/main/vae_decoder/openvino_model.xml",
        "https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0/resolve/main/vae_decoder/openvino_model.bin",
        "https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0/resolve/main/vae_decoder/config.json",
        "https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0/resolve/main/model_index.json",
        "https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0/resolve/main/01.png",
        "https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0/resolve/main/scheduler/scheduler_config.json",
        "https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0/resolve/main/.gitattributes",
        "https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0/resolve/main/tokenizer/merges.txt",
        "https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0/resolve/main/tokenizer/special_tokens_map.json",
        "https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0/resolve/main/tokenizer/tokenizer_config.json",
        "https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0/resolve/main/tokenizer/vocab.json",
        "https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0/resolve/main/README.md",
        "https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0/resolve/main/tokenizer_2/merges.txt",
        "https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0/resolve/main/tokenizer_2/special_tokens_map.json",
        "https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0/resolve/main/tokenizer_2/tokenizer_config.json",
        "https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0/resolve/main/tokenizer_2/vocab.json",
        "https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0/resolve/main/text_encoder_2/model.onnx",
        "https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0/resolve/main/text_encoder_2/openvino_model.xml",
        "https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0/resolve/main/text_encoder_2/model.fp16.safetensors",
        "https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0/resolve/main/text_encoder_2/openvino_model.bin",
        "https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0/resolve/main/text_encoder_2/model.safetensors",
        "https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0/resolve/main/text_encoder_2/model.onnx_data",
        "https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0/resolve/main/text_encoder_2/config.json",
        "https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0/resolve/main/sd_xl_base_1.0_0.9vae.safetensors",
        "https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0/resolve/main/comparison.png",
        "https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0/resolve/main/unet/model.onnx",
        "https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0/resolve/main/unet/openvino_model.xml",
        "https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0/resolve/main/unet/diffusion_pytorch_model.fp16.safetensors",
        "https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0/resolve/main/unet/diffusion_pytorch_model.safetensors",
        "https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0/resolve/main/unet/openvino_model.bin",
        "https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0/resolve/main/unet/model.onnx_data",
        "https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0/resolve/main/unet/config.json",
        "https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0/resolve/main/sd_xl_base_1.0.safetensors",
        "https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0/resolve/main/pipeline.png",
        "https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0/resolve/main/vae_encoder/model.onnx",
        "https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0/resolve/main/vae_encoder/openvino_model.xml",
        "https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0/resolve/main/vae_encoder/openvino_model.bin",
        "https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0/resolve/main/vae_encoder/config.json",
        "https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0/resolve/main/LICENSE.md",
        "https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0/resolve/main/files.txt",
        "https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0/resolve/main/sd_xl_offset_example-lora_1.0.safetensors",
        "https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0/resolve/main/vae_1_0/diffusion_pytorch_model.fp16.safetensors",
        "https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0/resolve/main/vae_1_0/diffusion_pytorch_model.safetensors",
        "https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0/resolve/main/vae_1_0/config.json",
        "https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0/resolve/main/vae/diffusion_pytorch_model.fp16.safetensors",
        "https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0/resolve/main/vae/diffusion_pytorch_model.safetensors",
        "https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0/resolve/main/vae/config.json",
        "https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0/resolve/main/text_encoder/model.onnx",
        "https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0/resolve/main/text_encoder/openvino_model.xml",
        "https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0/resolve/main/text_encoder/model.fp16.safetensors",
        "https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0/resolve/main/text_encoder/openvino_model.bin",
        "https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0/resolve/main/text_encoder/model.safetensors",
        "https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0/resolve/main/text_encoder/config.json"]
        .map(url => {
            return {
                url
            }
        })
    ,
    {
        hash: '4852686128f953d0277d0793e2f0335352f96a919c9c16a09787d77f55cbdf6f',
        name: 'sd_xl_offset_example-lora_1.0.safetensors',
        url: "https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0/resolve/main/sd_xl_offset_example-lora_1.0.safetensors",
    }, {
        hash: 'e6bb9ea85bbf7bf6478a7c6d18b71246f22e95d41bcdd80ed40aa212c33cfeff',
        name: 'sd_xl_base_1.0_0.9vae.safetensors',
        url: "https://cdn-lfs.huggingface.co/repos/7f/2f/7f2fe2e27137549cd28e570e5bac269b49ebcf1e0e47279c7a941ebe5c948e02/e6bb9ea85bbf7bf6478a7c6d18b71246f22e95d41bcdd80ed40aa212c33cfeff?response-content-disposition=attachment%3B+filename*%3DUTF-8%27%27sd_xl_base_1.0_0.9vae.safetensors%3B+filename%3D%22sd_xl_base_1.0_0.9vae.safetensors%22%3B&Expires=1694252955&Policy=eyJTdGF0ZW1lbnQiOlt7IkNvbmRpdGlvbiI6eyJEYXRlTGVzc1RoYW4iOnsiQVdTOkVwb2NoVGltZSI6MTY5NDI1Mjk1NX19LCJSZXNvdXJjZSI6Imh0dHBzOi8vY2RuLWxmcy5odWdnaW5nZmFjZS5jby9yZXBvcy83Zi8yZi83ZjJmZTJlMjcxMzc1NDljZDI4ZTU3MGU1YmFjMjY5YjQ5ZWJjZjFlMGU0NzI3OWM3YTk0MWViZTVjOTQ4ZTAyL2U2YmI5ZWE4NWJiZjdiZjY0NzhhN2M2ZDE4YjcxMjQ2ZjIyZTk1ZDQxYmNkZDgwZWQ0MGFhMjEyYzMzY2ZlZmY%7EcmVzcG9uc2UtY29udGVudC1kaXNwb3NpdGlvbj0qIn1dfQ__&Signature=ue0oFRYl5sDtgwJeshelpAuUbJCCTIYohgCb6%7ECUGccw%7EmAOmPg8W841o%7EiqapVldEndXWFxalvO7vErxae31z6t3MFtpmRCOIqxG0W-xt0QECMy-BfqX1gOhSq4tJlzeG8TQyaM%7ECbcUpzmuVNWj4QfFP-7VAnTMCjnRlTq%7EPSxvEYEPdSJBJ4NnddacWKVQFQ2aeIe5dKtO661iFx3tCEzWnI8IgiOZkD%7EC0nQZWUwwmM1BfVXpqxN8xf2YVrLPVepkLgY3up1YKboN-m7HvQAlIhio0sS2Xi11EmN0YEqyFpqb2uXl6L7EamBeExSFwperVa44Tku9l%7EpXeccAg__&Key-Pair-Id=KVTP0A1DKRTAX",
    }, {
        hash: '31e35c80fc4829d14f90153f4c74cd59c90b779f6afe05a74cd6120b893f7e5b',
        name: 'sd_xl_base_1.0.safetensors',
        url: "https://cdn-lfs.huggingface.co/repos/7f/2f/7f2fe2e27137549cd28e570e5bac269b49ebcf1e0e47279c7a941ebe5c948e02/31e35c80fc4829d14f90153f4c74cd59c90b779f6afe05a74cd6120b893f7e5b?response-content-disposition=attachment%3B+filename*%3DUTF-8%27%27sd_xl_base_1.0.safetensors%3B+filename%3D%22sd_xl_base_1.0.safetensors%22%3B&Expires=1694251601&Policy=eyJTdGF0ZW1lbnQiOlt7IkNvbmRpdGlvbiI6eyJEYXRlTGVzc1RoYW4iOnsiQVdTOkVwb2NoVGltZSI6MTY5NDI1MTYwMX19LCJSZXNvdXJjZSI6Imh0dHBzOi8vY2RuLWxmcy5odWdnaW5nZmFjZS5jby9yZXBvcy83Zi8yZi83ZjJmZTJlMjcxMzc1NDljZDI4ZTU3MGU1YmFjMjY5YjQ5ZWJjZjFlMGU0NzI3OWM3YTk0MWViZTVjOTQ4ZTAyLzMxZTM1YzgwZmM0ODI5ZDE0ZjkwMTUzZjRjNzRjZDU5YzkwYjc3OWY2YWZlMDVhNzRjZDYxMjBiODkzZjdlNWI%7EcmVzcG9uc2UtY29udGVudC1kaXNwb3NpdGlvbj0qIn1dfQ__&Signature=AjEVF35HSVOHWotVGQ4GkEBFIm9y6KLksp58xxx2WONrzXD1akf%7ERZBje0pXQniNwUFCzdjboUOAFD27aMBfQLeY6dJF9C1LlGAnPxdoFJybA8ExcXS6Fr2RXYIpKpp7Bs9GHr4jrPlhcNd2HxCPA8mD9msTYnjo7c9xzSAjHBik1Hui6oUgw6bJ3kOFlfH7ybIbU7GvgWoCcOU1ostgYdZ7l6jaXuM8bZT-Ff-X7kotd0Yj5bVzbOXQblxHTO9x6HyzS1bwh1TrkSvKhqfghAyXk8yesUXEXClouaIfQVJrTwpDWFUZ6daPucdeWQSX6kcH-SFSthihP4Sp65KvXg__&Key-Pair-Id=KVTP0A1DKRTAX",
    }, {
        url: "https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0/resolve/main/vae_encoder/model.onnx",
    }
];

async function downloadFiles(baseFolder, allFileUrls) {
    const maxParallelDownloads = 1;
    let parallelDownloads = 0;
    async function download(url, targetFile, hash) {
        parallelDownloads++;
        console.log(`Starting download: ${url}`);


        try {
            if (fs.readFileSync(path.join(baseFolder, 'completed.txt').toString())
                .indexOf(url) > -1) {
                console.log(`Skipping already downloaded: ${url}`);
                // if (hash)
                //     verifyFileHash(targetFile, hash).then(console.log).catch(console.error)
                return
            }

            let folder = path.dirname(targetFile)
            if (!fs.existsSync(folder)) {
                fs.mkdirSync(folder)
            }
            let fname = path.basename(targetFile)
            let bytesToMB = 1024 * 1024
            await new Promise((res, rej) => {
                new EasyDl(url, targetFile)
                    .on("progress", ({ details, total }) => {
                        console.log(fname, '=>', parseFloat((total.speed / (bytesToMB))).toFixed(2), "mbps : ", parseFloat(total.percentage).toFixed(2) + '%');
                    })
                    .wait()
                    .then((completed) => {
                        if (hash)
                            verifyFileHash(targetFile, hash).then(console.log).catch(console.error)
                        fs.appendFileSync(path.join(baseFolder, 'completed.txt'), url + "\n")
                        console.log(`Downloaded: ${url}`);
                        res()
                    })
                    .catch((err) => {
                        console.log(`[error] ${url}`, err);
                        rej()
                    });
            }).catch(e=>{
                console.log('error downloading', filePath)
            })
        }
        catch (e) {
            console.log('error downloading', filePath)
        }
        finally {
            parallelDownloads--;
        }
    }

    for (const fileUrl of allFileUrls) {
        while (parallelDownloads >= maxParallelDownloads) {
            // Wait for a download slot to become available
            await new Promise((resolve) => setTimeout(resolve, 1000));
        }

        var { url, hash } = fileUrl;
        var baseUrl = url.split("main")[0] + "main"
        var filePath = url.replace(baseUrl, baseFolder)

        if (fileUrl['name']) {
            filePath = path.join(baseFolder, fileUrl['name'])
        }
        download(url, filePath, hash);
    }
}


async function verifyFileHash(filePath, expectedHash) {
    const hash = crypto.createHash('sha256');
    const fileStream = fs.createReadStream(filePath);
    console.log("calculating hash", filePath)
    return new Promise((resolve, reject) => {
        fileStream.on('data', (data) => {
            hash.update(data);
        });

        fileStream.on('end', () => {
            const fileHash = hash.digest('hex');
            const verificationResult = fileHash === expectedHash ? 'Hash verification successful.' : 'Hash verification failed.';
            resolve({ filename: filePath, result: verificationResult });
        });

        fileStream.on('error', (error) => {
            reject({ filename: filePath, result: `Error reading file: ${error.message}` });
        });
    });
}

const baseFolder = "./stable-diffusion-xl-base-1.0";
if (!fs.existsSync(baseFolder)) {
    fs.mkdirSync(baseFolder)
    fs.writeFileSync(path.join('./', baseFolder, 'completed.txt'), '')
}
downloadFiles(baseFolder, downloads);
