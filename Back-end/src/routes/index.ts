import { Router } from "express";
import { register } from "../controllers/userController";
import { login } from "../controllers/authController";
import { auth } from "../middlewares/auth";

const router = Router();

router.post("/register", register);
router.post("/login", login);

router.get("/perfil", auth, (req, res) => {
  res.json({ user: req.user });
});

export default router;