
import { Router } from "express";

import {
    listarTurmas,
    cadastrarTurma,
    consultarTurma
} from "../controllers/turmas.controller.js";

const router = Router();

// Listar turmas
router.get("/", listarTurmas);

// Cadastrar turma
router.post("/", cadastrarTurma);

// Consultar turma específica
router.get("/:id", consultarTurma);

export default router;
