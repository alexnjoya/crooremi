import { startProvider } from "./cap/server.js";

startProvider().catch((err) => {
  console.error("[remifi] fatal:", err);
  process.exit(1);
});
