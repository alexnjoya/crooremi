import { createServer, type Server } from "node:http";

let providerOnline = false;
let server: Server | undefined;

export function setProviderOnline(online: boolean): void {
  providerOnline = online;
}

export function startHealthServer(port = Number(process.env.PORT) || 3001): Server {
  server = createServer((req, res) => {
    const path = req.url?.split("?")[0];
    if (path === "/health" || path === "/") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          ok: true,
          service: "remifi-cap-provider",
          provider: providerOnline ? "online" : "connecting",
        }),
      );
      return;
    }

    res.writeHead(404);
    res.end();
  });

  server.listen(port, "0.0.0.0", () => {
    console.log(`[remifi] health server listening on 0.0.0.0:${port}`);
  });

  return server;
}

export function stopHealthServer(): void {
  server?.close();
}
