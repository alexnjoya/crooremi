import { startProvider } from "./cap/server.js";
import { startHealthServer } from "./health.js";
import { registerProcessHandlers, validateStartup } from "./startup.js";

registerProcessHandlers();

try {
  validateStartup();
} catch (err) {
  console.error("[remifi] startup validation failed:", err);
  process.exit(1);
}

startHealthServer();

void startProvider();
