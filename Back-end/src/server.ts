import "dotenv/config";
import express from "express";
import cors from "cors";
import routes from "./routes";
import { auditLogger } from "./middlewares/auditLogger";
import { errorHandler } from "./middlewares/errorHandler";
import { securityMiddleware } from "./middlewares/security";
import { sanitizeInput } from "./middlewares/sanitize";

const app = express();

app.use(cors());
app.use(express.json());

// 🔒 SEGURANÇA
app.use(securityMiddleware);

// 🧼 SANITIZAÇÃO
app.use(sanitizeInput);

// 🧾 LOG
app.use(auditLogger);

app.use(routes);

app.get("/", (req, res) => {
  res.send("API rodando");
});

app.listen(3001, () => {
  console.log("Servidor rodando na porta 3001");
});

app.use(errorHandler);