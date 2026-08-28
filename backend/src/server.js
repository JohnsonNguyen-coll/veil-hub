import { createServer } from "node:http";
import { PORT } from "./config/constants.js";
import { ensureStore } from "./services/storeService.js";
import { runKeeper } from "./services/keeperService.js";
import { json, notFound, routes } from "./controllers/apiControllers.js";

const server = createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    return json(res, 204, {});
  }

  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
  const match = routes.find((item) => item.method === req.method && item.pattern.test(url.pathname));

  if (!match) return notFound(res);

  try {
    const params = url.pathname.match(match.pattern).slice(1).map(decodeURIComponent);
    return await match.handler(req, res, params);
  } catch (error) {
    const status = error.status || 500;
    return json(res, status, {
      error: status === 500 ? "INTERNAL_ERROR" : "REQUEST_ERROR",
      message: error.message
    });
  }
});

await ensureStore();
await runKeeper();

server.listen(PORT, () => {
  console.log(`VeilHubs backend listening on http://127.0.0.1:${PORT}`);
});
