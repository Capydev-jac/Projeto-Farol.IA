
import { Router } from "express";

import {
  listarAlunos,
  cadastrarAluno,
  consultarAluno,
} from "../controllers/alunos.controller.js";

const router = Router();

// Listar estudantes
router.get("/", listarAlunos);

// Cadastrar estudante
router.post("/", cadastrarAluno);

// Consultar estudante específico
router.get("/:id", consultarAluno);

export default router;
