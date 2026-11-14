import { Router } from "express";
import { preverRisco } from "../controllers/predicao.controller.js";

const router = Router();

router.post("/aluno", preverRisco);

export default router;