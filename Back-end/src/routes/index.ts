import { Router } from "express";
import { login, me, refresh } from "../controllers/authController";
import { auth } from "../middlewares/auth";
import { cityAccess } from "../middlewares/cityAccess";
import { getStudentsByRoute } from "../controllers/studentController";

const router = Router();

router.post("/auth/login", login);
router.post("/auth/refresh", refresh);
router.get("/auth/me", auth, me);

// 🔥 NOVO: alunos por rota com isolamento de cidade
router.get(
  "/students/by-route/:routeId",
  auth,
  cityAccess,
  getStudentsByRoute
);

export default router;
