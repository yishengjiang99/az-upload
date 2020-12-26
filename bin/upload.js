#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cspawn = exports.uploadSync = exports.wsclient = void 0;
const storage_blob_1 = require("@azure/storage-blob");
const child_process_1 = require("child_process");
const fs_1 = require("fs");
const path_1 = require("path");
var mime = require("lighter-mime");
exports.wsclient = (AZConnectionSTring = "") => {
    if (AZConnectionSTring) {
        return storage_blob_1.BlobServiceClient.fromConnectionString(AZConnectionSTring);
    }
    else if (process.env.azaccoutname && process.env.azkey) {
        return new storage_blob_1.BlobServiceClient(`https://${process.env.azaccoutname}.blob.core.windows.net`, new storage_blob_1.StorageSharedKeyCredential(process.env.azaccountname, process.env.azkey));
    }
    else if (process.env.AZURE_STORAGE_ACCOUNT &&
        process.env.AZURE_STORAGE_ACCESS_KEY) {
        return new storage_blob_1.BlobServiceClient(`https://${process.env.AZURE_STORAGE_ACCOUNT}.blob.core.windows.net`, new storage_blob_1.StorageSharedKeyCredential(process.env.AZURE_STORAGE_ACCOUNT, process.env.AZURE_STORAGE_ACCESS_KEY));
    }
    else if (process.env.AZURE_STORAGE_CONNECTION_STRING) {
        return storage_blob_1.BlobServiceClient.fromConnectionString(process.env.AZURE_STORAGE_CONNECTION_STRING);
    }
    else {
        return new storage_blob_1.BlobServiceClient("https://grep32bit.blob.core.windows.net", new storage_blob_1.AnonymousCredential());
    }
};
function uploadSync(filepath, container) {
    const file = path_1.resolve(filepath);
    return exports.wsclient()
        .getContainerClient(container)
        .uploadBlockBlob(path_1.basename(file), fs_1.readFileSync(file), fs_1.statSync(file).size, {
        blobHTTPHeaders: {
            blobContentType: mime[path_1.extname(file)],
        },
    })
        .then(({ blockBlobClient, response }) => {
        if (response.errorCode)
            throw new Error(response.errorCode);
        return blockBlobClient;
    })
        .catch((e) => {
        Promise.reject(e);
    });
}
exports.uploadSync = uploadSync;
exports.cspawn = (cmd, str) => {
    const proc = child_process_1.spawn(cmd, str.split(" "));
    proc.stderr.pipe(process.stderr);
    // console.log(cmd + " " + str);
    return proc;
};
if ((require.main === module && process.argv[2]) || process.argv[3]) {
    uploadSync(process.argv[2] || process.argv[3], "pcm")
        .then((res) => {
        if (!res)
            throw "e";
        process.stdout.write(res.url + "\n");
        return res.getProperties();
    })
        .then((props) => {
        if (props) {
            console.log(props);
        }
    })
        .catch(console.log);
}
//# sourceMappingURL=upload.js.map