import { Router } from "express";
import { login, me, refresh } from "../controllers/authController";
import { auth } from "../middlewares/auth";
import { cityAccess } from "../middlewares/cityAccess";
import { getStudentsByRoute } from "../controllers/studentController";
import {
  listCityAgreements,
  createCityAgreement,
  updateCityAgreementStatus,
  listCities,
} from "../controllers/cityAgreementController";

const router = Router();

router.post("/auth/login", login);
router.post("/auth/refresh", refresh);
router.get("/auth/me", auth, me);

// 🔥 alunos por rota
router.get(
  "/students/by-route/:routeId",
  auth,
  cityAccess,
  getStudentsByRoute
);

// 🔥 cidades
router.get("/cities", auth, listCities);

// 🔥 acordos entre cidades
router.get("/cities/agreements", auth, listCityAgreements);
router.post("/cities/agreements", auth, createCityAgreement);
router.patch(
  "/cities/agreements/:id",
  auth,
  updateCityAgreementStatus
);

export default router;
