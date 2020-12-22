#!/Users/yisheng/.nvm/versions/node/v14.15.0/bin/node

"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cspawn = exports.uploadSync = exports.wsclient = exports.listContainerFiles = void 0;
const storage_blob_1 = require("@azure/storage-blob");
const child_process_1 = require("child_process");
const fs_1 = require("fs");
const path_1 = require("path");
var list_blobs_1 = require("./list-blobs");
Object.defineProperty(exports, "listContainerFiles", { enumerable: true, get: function () { return list_blobs_1.listContainerFiles; } });
__exportStar(require("./page-blobs"), exports);
exports.wsclient = (azconn_str = "") => storage_blob_1.BlobServiceClient.fromConnectionString(azconn_str ||
    process.env.AZ_CONN_STR ||
    process.env.AZURE_STORAGE_CONNECTION_STRING);
function uploadSync(filepath, container) {
    const file = path_1.resolve(filepath);
    return exports.wsclient()
        .getContainerClient(container)
        .uploadBlockBlob(path_1.basename(file), fs_1.readFileSync(file), fs_1.statSync(file).size, {
        blobHTTPHeaders: {
            blobContentType: require("mime-types").lookup(file),
        },
    })
        .then(({ blockBlobClient, response }) => {
        if (response.errorCode && !blockBlobClient)
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
if (process.argv[2] || process.argv[3]) {
    uploadSync(process.argv[2] || process.argv[3], "pcm")
        .then((res) => {
        process.stdout.write(res && res.url);
    })
        .catch(console.log);
}
//# sourceMappingURL=index.js.map
