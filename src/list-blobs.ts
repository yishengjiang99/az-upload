import { wsclient } from ".";
import { Readable, Transform, Writable } from "stream";
import { BlobItem } from "@azure/storage-blob";
import { execSync } from "child_process";
import { WsServer, WsSocket } from "grep-wss";
export async function listContainerFiles(container): Promise<BlobItem[]> {
  const containerClient = wsclient().getContainerClient(container);
  const iterator = containerClient.listBlobsFlat();
  const ret = [];
  for await (const item of iterator) {
    ret.push(item);
  }
  return ret;
}

export async function readContainerFiles(container): Promise<Readable> {
  const chunks = [];
  const r = new Readable({
    read(size?: number) {
      let pushed = 0;
      if (typeof size === "undefined") {
        this.push(chunks.shift());
      }
      while (chunks[0] && pushed < size) {
        if (chunks[0] > size - pushed) {
          this.push(chunks[0].slice(0, size));
          chunks[0] = chunks[0].slice(size);
          pushed += size - pushed;
        } else {
          pushed += chunks[0].byteLength;
          this.push(chunks.shift());
        }
      }
    },
  });
  const cc = wsclient().getContainerClient(container);
  await (async function () {
    for await (const response of cc
      .listBlobsByHierarchy("/", {
        includeMetadata: true,
      })
      .byPage({ maxPageSize: 5 })) {
      const segment = response.segment;
      if (segment.blobPrefixes) {
        for (const prefix of segment.blobPrefixes) {
          chunks.push("prefix" + prefix.name);
          r.emit("data", "prefix" + prefix.name);
        }
      }
      for (const file of response.segment.blobItems) {
        const {
          name,
          properties: {
            createdOn,
            blobType,
            contentType,
            contentDisposition,
            lastAccessedOn,
          },
        } = file;

        chunks.push(
          JSON.stringify({
            name,
            blobType,
            contentType,
            contentDisposition,
            lastAccessedOn,
          })
        );
        r.emit("data", chunks[chunks.length - 1]);
      }
    }
  })();
  return r;
}

export const runwss = () => {
  const wsc = wsclient();
  const wss = new WsServer({ port: 8080 });
  wss.on("connection", async (ws: WsSocket) => {
    const context = {
      cwd: [],
    };
    for await (const container of wsc.listContainers()) {
      ws.write(container.name);
    }
    ws.on("data", async (d) => {
      console.log(d.toString());
      const t = d.toString().split(" ");
      switch (t.shift()) {
        case "cd":
          if (!t[0]) {
            ws.write("which container?");
          } else {
            context.cwd.push(t[0]);
            (await readContainerFiles(t[0])).on("data", (d) => {
              ws.write(d.toString());
            });
          }
          break;
        case "ls":
          if (context.cwd.length === 0) {
            for await (const container of wsc.listContainers()) {
              ws.write(container.name);
            }
          } else {
            (await readContainerFiles(t[0])).on("data", (d) => {
              ws.write(d.toString());
            });
          }
          break;
        case "cat":
          if (!t[0]) {
            ws.write("which file");
            break;
          }
          if (context.cwd) {
            const bc = wsc
              .getContainerClient(context.cwd.toString())
              .getBlobClient(t[0]);
            const { contentType, contentLength } = await bc.getProperties();
            bc.download().then((resp) => {
              const rs = resp.readableStreamBody;
              rs.on("readable", () => {
                ws.write(
                  "binaryType: " +
                    contentType +
                    "\n" +
                    "Content-Length: " +
                    contentLength +
                    "\nChunked Encoding Separator: ~~~~~"
                );
              });
              resp.readableStreamBody.on("data", (d) => {
                ws.write("~~~~~\r\n" + d.byteLength);
                ws.write(d);
                ws.write("~~~~~\r\n");
              });
            });
          }
          break;
      }
    });
  });
  wss.start();
};

//runwss();
