#!/usr/bin/env node

import {
  StorageSharedKeyCredential,
  BlockBlobClient,
  BlobServiceClient,
  ContainerClient,
  AnonymousCredential,
} from "@azure/storage-blob";

import { spawn } from "child_process";
import { readFileSync, statSync } from "fs";

import { basename, resolve, extname } from "path";
export { listContainerFiles } from "./list-blobs";
var mime = require("lighter-mime");

export const wsclient = (
  AZConnectionSTring: string = ""
): BlobServiceClient => {
  if (AZConnectionSTring) {
    return BlobServiceClient.fromConnectionString(AZConnectionSTring);
  } else if (process.env.azaccoutname && process.env.azkey) {
    return new BlobServiceClient(
      `https://${process.env.azaccoutname}.blob.core.windows.net`,
      new StorageSharedKeyCredential(
        process.env.azaccountname,
        process.env.azkey
      )
    );
  } else if (
    process.env.AZURE_STORAGE_ACCOUNT &&
    process.env.AZURE_STORAGE_ACCESS_KEY
  ) {
    return new BlobServiceClient(
      `https://${process.env.AZURE_STORAGE_ACCOUNT}.blob.core.windows.net`,
      new StorageSharedKeyCredential(
        process.env.AZURE_STORAGE_ACCOUNT,
        process.env.AZURE_STORAGE_ACCESS_KEY
      )
    );
  } else if (process.env.AZURE_STORAGE_CONNECTION_STRING) {
    return BlobServiceClient.fromConnectionString(
      process.env.AZURE_STORAGE_CONNECTION_STRING
    );
  } else {
    return new BlobServiceClient(
      "https://grep32bit.blob.core.windows.net",
      new AnonymousCredential()
    );
  }
};

export function uploadSync(
  filepath: string,
  container: string
): Promise<BlockBlobClient | void> {
  const file = resolve(filepath);
  return wsclient()
    .getContainerClient(container)
    .uploadBlockBlob(basename(file), readFileSync(file), statSync(file).size, {
      blobHTTPHeaders: {
        blobContentType: mime[extname(file)],
      },
    })
    .then(({ blockBlobClient, response }) => {
      if (response.errorCode) throw new Error(response.errorCode);
      return blockBlobClient;
    })
    .catch((e) => {
      Promise.reject(e);
    });
}
export const cspawn = (cmd, str) => {
  const proc = spawn(cmd, str.split(" "));
  proc.stderr.pipe(process.stderr);
  // console.log(cmd + " " + str);
  return proc;
};
if ((require.main === module && process.argv[2]) || process.argv[3]) {
  uploadSync(process.argv[2] || process.argv[3], "pcm")
    .then((res) => {
      if (!res) throw "e";
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
console.log(process.argv);
