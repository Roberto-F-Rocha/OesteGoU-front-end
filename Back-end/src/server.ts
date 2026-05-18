import "dotenv/config";
import express from "express";
import cors from "cors";
import routes from "./routes";
import { auditLogger } from "./middlewares/auditLogger";
import { errorHandler } from "./middlewares/errorHandler";
import { securityMiddleware } from "./middlewares/security";
import { sanitizeInput } from "./middlewares/sanitize";
import { startPushJobs } from "./jobs/pushJob";
import http from "http";
import { initSocket } from "./lib/socket";

const app = express();
const PORT = Number(process.env.PORT) || 3001;

function getAllowedOrigins() {
  const origins = new Set<string>();

  if (process.env.FRONTEND_URL) origins.add(process.env.FRONTEND_URL);
  if (process.env.FRONTEND_URLS) {
    process.env.FRONTEND_URLS.split(",")
      .map((origin) => origin.trim())
      .filter(Boolean)
      .forEach((origin) => origins.add(origin));
  }

  origins.add("https://oestegou.up.railway.app");
  origins.add("https://incredible-harmony-production-4273.up.railway.app");
  origins.add("http://localhost:8080");
  origins.add("http://localhost:5173");

  return Array.from(origins);
}

const corsOptions: cors.CorsOptions = {
  origin(origin, callback) {
    const allowedOrigins = getAllowedOrigins();

    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error(`CORS bloqueado para origem: ${origin}`));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));
app.use(express.json());

app.use(securityMiddleware);
app.use(sanitizeInput);
app.use(auditLogger);
app.use(routes);

app.get("/", (req, res) => {
  res.send("API rodando");
});

app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", service: "OesteGoU API" });
});

startPushJobs();

const server = http.createServer(app);
initSocket(server);

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});

app.use(errorHandler);
