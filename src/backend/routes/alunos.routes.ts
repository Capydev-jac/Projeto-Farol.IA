
import { Router } from "express";

import {
  listarAlunos,
  cadastrarAluno,
  consultarAluno,
  excluirAluno,
  editarAluno,
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

//Editar aluno

router.patch("/:id", editarAluno);

export default router;
