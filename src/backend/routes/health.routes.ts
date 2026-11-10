
import { Router } from "express";
import { verificarSaude } from "../controllers/health.controller.js";

const router = Router();

// Verificar saúde da API e conexão com o banco
router.get("/", verificarSaude);

export default router;
