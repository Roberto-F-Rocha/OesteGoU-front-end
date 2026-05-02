import { Router } from "express";
import { authMiddleware } from "../middlewares/authMiddleware";
import {
  createMaintenanceTicket,
  getMyMaintenanceTickets,
  listMaintenanceTickets,
  updateMaintenanceTicket,
} from "../controllers/maintenanceTicketController";

const router = Router();

router.use(authMiddleware);

router.post("/", createMaintenanceTicket);
router.get("/my", getMyMaintenanceTickets);
router.get("/", listMaintenanceTickets);
router.patch("/:id", updateMaintenanceTicket);

export default router;
