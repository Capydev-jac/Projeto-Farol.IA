
import express from "express";
import cors from "cors";

import turmasRoutes from "./routes/turmas.routes.js";
import enemRoutes from "./routes/enem.routes.js";
import alunosRoutes from "./routes/alunos.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";
import intervencoesRoutes from "./routes/intervencoes.routes.js";
import healthRoutes from "./routes/health.routes.js";

const app = express();

// ========================================
// CONFIGURAÇÕES
// ========================================

app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json({ limit: "1mb" }));

// ========================================
// ROTAS
// ========================================

// Turmas
app.use("/api/turmas", turmasRoutes);

// ENEM
app.use("/api/enem", enemRoutes);

// ALUNOS
app.use("/api/alunos", alunosRoutes);

// DASHBOARD
app.use("/api/dashboard", dashboardRoutes);

//INTERVENÇÕES
app.use("/api/intervencoes", intervencoesRoutes);

app.use("/api/health", healthRoutes);


export default app;
