import "dotenv/config";
import express from "express";
import cors from "cors";
import routes from "./routes";
import { auditLogger } from "./middlewares/auditLogger";

const app = express();

app.use(cors());
app.use(express.json());

// 🔥 AUDITORIA GLOBAL
app.use(auditLogger);

app.use(routes);

app.get("/", (req, res) => {
  res.send("API rodando");
});

app.listen(3001, () => {
  console.log("Servidor rodando na porta 3001");
});
