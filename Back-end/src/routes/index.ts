import { Router } from "express";
import { login, me, refresh } from "../controllers/authController";
import { registerUser } from "../controllers/registerController";
import { auth } from "../middlewares/auth";
import { cityAccess } from "../middlewares/cityAccess";
import { getStudentsByRoute } from "../controllers/studentController";
import { getDriverRoutes } from "../controllers/driverController";
import {
  listCityAgreements,
  createCityAgreement,
  updateCityAgreementStatus,
  listCities,
} from "../controllers/cityAgreementController";
import {
  createReservation,
  getMyReservations,
  cancelReservation,
} from "../controllers/reservationController";

const router = Router();

router.post("/auth/login", login);
router.post("/auth/register", registerUser);
router.post("/auth/refresh", refresh);
router.get("/auth/me", auth, me);

// alunos por rota
router.get(
  "/students/by-route/:routeId",
  auth,
  cityAccess,
  getStudentsByRoute
);

// rotas do motorista
router.get(
  "/driver/routes",
  auth,
  cityAccess,
  getDriverRoutes
);

// 🔥 RESERVAS DO ALUNO
router.post("/reservations", auth, createReservation);
router.get("/my-reservations", auth, getMyReservations);
router.patch("/reservations/:id/cancel", auth, cancelReservation);

// cidades
router.get("/cities", auth, listCities);

// acordos entre cidades
router.get("/cities/agreements", auth, listCityAgreements);
router.post("/cities/agreements", auth, createCityAgreement);
router.patch(
  "/cities/agreements/:id",
  auth,
  updateCityAgreementStatus
);

export default router;
