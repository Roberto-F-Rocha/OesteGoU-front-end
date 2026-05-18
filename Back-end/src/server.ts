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

app.use(cors());
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
