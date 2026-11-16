
import { Router } from "express";

import {
    listarTurmas,
    cadastrarTurma,
    consultarTurma,
    excluirTurma
} from "../controllers/turmas.controller.js";

const router = Router();

// Listar turmas
router.get("/", listarTurmas);

// Cadastrar turma
router.post("/", cadastrarTurma);

// Consultar turma específica
router.get("/:id", consultarTurma);

// Excluir turma
router.delete("/:id", excluirTurma);

export default router;
