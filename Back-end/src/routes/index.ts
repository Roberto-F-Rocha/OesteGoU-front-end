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
import {
  getAdminDashboard,
  listAdminUsers,
  updateUserStatus,
  createDriver,
  listVehicles,
  createVehicle,
  updateVehicle,
  listSchedules,
  createSchedule,
  listPickupPoints,
  createPickupPoint,
  listRoutes,
  createRoute,
  listAuditLogs,
} from "../controllers/adminController";

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

// reservas
router.post("/reservations", auth, createReservation);
router.get("/my-reservations", auth, getMyReservations);
router.patch("/reservations/:id/cancel", auth, cancelReservation);

// 🔥 ADMIN
router.get("/admin/dashboard", auth, cityAccess, getAdminDashboard);
router.get("/admin/users", auth, cityAccess, listAdminUsers);
router.patch("/admin/users/:id/status", auth, cityAccess, updateUserStatus);
router.post("/admin/drivers", auth, cityAccess, createDriver);

router.get("/admin/vehicles", auth, cityAccess, listVehicles);
router.post("/admin/vehicles", auth, cityAccess, createVehicle);
router.patch("/admin/vehicles/:id", auth, cityAccess, updateVehicle);

router.get("/admin/schedules", auth, cityAccess, listSchedules);
router.post("/admin/schedules", auth, cityAccess, createSchedule);

router.get("/admin/pickup-points", auth, cityAccess, listPickupPoints);
router.post("/admin/pickup-points", auth, cityAccess, createPickupPoint);

router.get("/admin/routes", auth, cityAccess, listRoutes);
router.post("/admin/routes", auth, cityAccess, createRoute);

router.get("/admin/audit-logs", auth, cityAccess, listAuditLogs);

// cidades
router.get("/cities", auth, listCities);

// acordos
router.get("/cities/agreements", auth, listCityAgreements);
router.post("/cities/agreements", auth, createCityAgreement);
router.patch("/cities/agreements/:id", auth, updateCityAgreementStatus);

export default router;
