
import { Router } from "express";

import {
  listarAlunos,
  cadastrarAluno,
  consultarAluno,
  excluirAluno,
} from "../controllers/alunos.controller.js";

const router = Router();

// Listar estudantes
router.get("/", listarAlunos);

// Cadastrar estudante
router.post("/", cadastrarAluno);

// Consultar estudante específico
router.get("/:id", consultarAluno);

// Excluir estudante
router.delete("/:id", excluirAluno);

export default router;
