
import { Router } from "express";

import {
  listarIntervencoes,
  salvarIntervencao,
} from "../controllers/intervencoes.controller.js";

const router = Router();

// Listar planos de intervenção
router.get("/", listarIntervencoes);

// Criar ou atualizar plano de intervenção
router.put("/:id", salvarIntervencao);

export default router;
