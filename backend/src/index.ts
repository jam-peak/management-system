import { Hono } from "hono";
import { cors } from "hono/cors";

// Import minimal routes
import devices from "./routes/devices";
import readings from "./routes/readings";
import commandsRouter from "./routes/commands";

const app = new Hono();

app.use(
  "*",
  cors({
    origin: "http://localhost:3000", // Allow localhost for development
    allowHeaders: ["Content-Type", "Authorization", "X-API-Key"],
    allowMethods: ["POST", "GET", "PATCH", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
    credentials: true,
  })
);

// API routes
app.route("/devices", devices);
app.route("/readings", readings);
app.route("/commands", commandsRouter);

app.get("/", (c) => {
  return c.json({
    service: "Real-Time Adaptive Traffic System API",
    version: "1.0.0",
    status: "running",
  });
});

export default app;
