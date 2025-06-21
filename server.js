import { createBareServer } from "@tomphttp/bare-server-node";
import express from "express";
import { createServer } from "node:http";
import { uvPath } from "@titaniumnetwork-dev/ultraviolet";
import path, { join } from "node:path";
import { hostname } from "node:os";
import { fileURLToPath } from "node:url";

// Fix __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create Bare server
const bare = createBareServer("/bare/");

// Create Express app
const app = express();
const publicPath = "public";

// Serve static files
app.use(express.static(publicPath));
app.use("/petezah/", express.static(uvPath));

// Custom 404 fallback（レスポンスが既に送られているかチェック）
app.use((req, res, next) => {
  if (res.headersSent) return next();
  res.status(404).sendFile(join(__dirname, publicPath, "404.html"));
});

// Create HTTP server and attach Express + Bare
const server = createServer(app);

server.on("request", (req, res) => {
  if (bare.shouldRoute(req)) {
    bare.routeRequest(req, res);
  } else {
    app(req, res);
  }
});

server.on("upgrade", (req, socket, head) => {
  if (bare.shouldRoute(req)) {
    bare.routeUpgrade(req, socket, head);
  } else {
    socket.end();
  }
});

// Start server
const port = parseInt(process.env.PORT || "3000", 10);
server.listen(port, () => {
  const address = server.address();
  console.log("Listening on:");
  console.log(`\thttp://localhost:${address.port}`);
  console.log(`\thttp://${hostname()}:${address.port}`);
  console.log(
    `\thttp://${address.family === "IPv6" ? `[${address.address}]` : address.address}:${address.port}`
  );
});

// Graceful shutdown
function shutdown() {
  console.log("SIGTERM signal received: closing HTTP server");
  server.close();
  bare.close();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);