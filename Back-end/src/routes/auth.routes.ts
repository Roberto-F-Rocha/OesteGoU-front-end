import { Router } from "express";
import { login, refresh, me } from "../controllers/authController";
import { auth } from "../middlewares/auth";

const router = Router();

/**
 * AUTH FLOW (padrão banco digital)
 */
router.post("/auth/login", login);
router.post("/auth/refresh", refresh);
router.get("/auth/me", auth, me);

export default router;