
import { Router } from "express";
import { consultarDashboard } from "../controllers/dashboard.controller.js";

const router = Router();

// Consultar dados do dashboard
router.get("/", consultarDashboard);

export default router;
