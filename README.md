<h1 align="center">💡 Projeto Farol.IA 💡</h1>

<p align="center">O <strong>Farol.IA</strong> é uma plataforma web de Inteligência Educacional desenvolvida por estudantes do 5º semestre de Desenvolvimento de Software Multiplataforma (DSM) da <strong>FATEC Jacareí</strong>, com o objetivo de realizar a predição do sucesso escolar no ENEM. Utilizando modelos de Machine Learning aplicados a microdados socioeconômicos e acadêmicos, a solução identifica precocemente alunos em situação de risco educacional, fornecendo aos gestores públicos e EdTechs dados cruciais para o combate à evasão e ao baixo rendimento escolar.</p>

<h2 align="center">📌 Sobre o Projeto</h2>

# 🎓 Farol.IA – Plataforma Web de Inteligência Educacional para Predição de Desempenho no ENEM

O **Farol.IA** é uma solução em nuvem composta por:

- 🤖 **Modelo de Machine Learning**: Regressão/Classificação treinado com microdados do ENEM para predição de notas finais e probabilidade de alto desempenho;
- ☁️ **Backend em Nuvem (API REST)**: Serviço responsável pelo processamento preditivo automático, integração com a base histórica e endpoints documentados;
- 💻 **Aplicação Web / Dashboard Interativo**: Interface para inserção individual ou em lote de dados socioeconômicos, visualização de painéis gerenciais e exportação de relatórios.

> **Objetivo principal**: Tornar a gestão educacional mais ágil e orientada a dados, permitindo intervenções pedagógicas precoces através da identificação preditiva de perfis de alunos em risco.

**Instituição**: Faculdade de Tecnologia Professor Francisco de Moura – FATEC Jacareí  
**Curso**: 5º DSM – Desenvolvimento de Software Multiplataforma  
**Cliente/Público-alvo**: Secretarias de Educação e Plataformas de EdTech  
**Focal Point**: Professor da disciplina de Laboratório de Desenvolvimento Web  
**Kick-off**: 06/10/2026  

---

<h2>🗓️ Sprints</h2>

| Sprints | Início | Fim | Relatório |
|---------|--------|-----|-----------|
| 1ª sprint | 06/10/2026 | 20/10/2026 (19h30) | <a href="#">Em breve</a> |
| 2ª sprint | 21/10/2026 | 10/11/2026 (19h30) | <a href="#">Em breve</a> |
| 3ª sprint | 11/11/2026 | 24/11/2026 (19h30) | <a href="#">Em breve</a> |

> 🎯 **Apresentação Final**: Final do Semestre (data a definir)

---

<h2>📋 Product Backlog</h2>

| ID | Requisito | Descrição | Prioridade | User Story | Critérios de Aceitação (DoD) | Definição de Pronto (DoR) |
|----|-----------|-----------|------------|------------|-----------------------------|---------------------------|
| **RF01** | Inserção de Dados para Análise | Permitir ao usuário preencher dados individuais ou importar base em lote com variáveis socioeconômicas e acadêmicas. | Alta | Como gestor educacional, quero inserir dados individuais ou importar em lote para analisar o perfil dos alunos. | ✅ Formulário de inserção individual funcional.<br>✅ Suporte a importação de arquivo em lote (CSV/XLSX).<br>✅ Validação de campos e formatos. | 🔹 Modelo de dados do questionário definido.<br>🔹 API de upload/ingestão testada. |
| **RF02** | Processamento Preditivo Automático | Endpoint no backend que aplica o modelo de Machine Learning para gerar a predição de nota ou probabilidade de alto desempenho. | Alta | Como analista, quero que o sistema processe automaticamente os dados para calcular a predição do aluno. | ✅ Integração do modelo de ML ao backend.<br>✅ Retorno de nota ou probabilidade de risco/sucesso.<br>✅ Tempo de resposta otimizado. | 🔹 Modelo treinado, validado e exportado.<br>🔹 API REST integrada com a pipeline do modelo. |
| **RF03** | Visualização em Painel Interativo | Dashboard interativo para apresentação das análises, destacando alunos de alto risco e permitindo filtros. | Alta | Como coordenador pedagógico, quero visualizar os resultados em gráficos interativos para identificar alunos prioritários. | ✅ Dashboard funcional com indicadores de risco.<br>✅ Filtros por renda, tipo de escola e infraestrutura.<br>✅ Destaque visual para casos críticos. | 🔹 Protótipo de telas/UX aprovado.<br>🔹 Componentes de gráficos integrados ao frontend. |
| **RF04** | Integração e Comparativo Histórico | Apresentar visão macro comparando as predições atuais com o comportamento geral da base histórica do ENEM. | Média | Como formulador de políticas, quero comparar dados atuais com o histórico do ENEM para embasar decisões. | ✅ Mapeamento e agregação da base de dados histórica.<br>✅ Gráficos comparativos no painel.<br>✅ Métricas de tendência contextualizadas. | 🔹 Base histórica tratada e pré-processada.<br>🔹 Consultas de agregação otimizadas no backend. |
| **RF05** | Download dos Resultados | Permitir a exportação dos relatórios estratégicos e tabelas com as análises preditivas produzidas. | Média | Como gestor, quero baixar os relatórios em formato exportável para compartilhar com a equipe escolar. | ✅ Exportação dos dados preditivos (PDF/CSV/Excel).<br>✅ Relatório formatado com resumos e gráficos.<br>✅ Download liberado via interface. | 🔹 Formato dos relatórios definido.<br>🔹 Endpoint/gerador de arquivos implementado. |
| **RNF01** | Documentação da API | Documentar endpoints, parâmetros de requisição, formatos de entrada/saída e mensagens de erro. | Alta | Como desenvolvedor, quero uma API documentada para facilitar a integração entre front e back. | ✅ Documentação interativa disponível (Swagger/OpenAPI).<br>✅ Exemplos claros de request/response.<br>✅ Códigos de erro padronizados. | 🔹 Swagger/Postman configurado.<br>🔹 Endpoints atualizados e testados. |
| **RNF02** | Implantação em Nuvem | Backend, serviço de processamento e frontend implantados e acessíveis via navegador na nuvem. | Alta | Como usuário final, quero acessar a aplicação diretamente pelo navegador, hospedada na nuvem. | ✅ Deploy do frontend e backend realizado.<br>✅ Banco de dados/modelo em nuvem.<br>✅ URL pública funcional e estável. | 🔹 Provedor de nuvem selecionado (AWS/GCP/Vercel/Render).<br>🔹 Scripts de deploy testados. |
| **RNF03** | Treinamento e Validação do Modelo | Documentação completa do pipeline do modelo de ML (dados, métricas, algoritmos e acurácia). | Alta | Como cientista de dados, quero documentar a acurácia e validação do modelo para garantir confiabilidade. | ✅ Relatório de métricas de avaliação (R², MAE, F1-Score, etc.).<br>✅ Documentação do pipeline de pré-processamento.<br>✅ Matriz de confusão / gráficos de erro. | 🔹 Dataset do Kaggle limpo e Amostrado.<br>🔹 Experimentos de validação cruzada concluídos. |
| **RNF04** | Privacidade e Tratamento de Dados (LGPD) | Garantir a anonimização dos dados dos estudantes em estrita conformidade com a LGPD. | Alta | Como encarregado de dados, quero garantir que a solução não exponha dados sensíveis não anonimizados. | ✅ Anonimização completa de identificadores diretos.<br>✅ Criptografia de dados armazenados e em trânsito.<br>✅ Termos e conformidade LGPD documentados. | 🔹 Mapeamento de dados sensíveis realizado.<br>🔹 Rotinas de anonimização validadas. |

---

<h2>Equipe</h2>

| Nome | Cargo | Mídia Social |
| ---- | ----- | ------------ |
| Gabriel Camargo | Scrum Master | <a href="https://github.com/AllanDreemur"><img src="https://skillicons.dev/icons?i=github"></a> |
| João Victor | Product Owner | <a href="https://github.com/joaoestreano"><img src="https://skillicons.dev/icons?i=github"></a> |
| Breno de Luca | Desenvolvedor | <a href="https://github.com/brn-lc"><img src="https://skillicons.dev/icons?i=github"></a> |
| Gabriel Frois | Desenvolvedor | <a href="https://github.com/GabrielFrois"><img src="https://skillicons.dev/icons?i=github"></a> |
| Felipe Ribeiro | Desenvolvedor | <a href="https://github.com/feliperib286"><img src="https://skillicons.dev/icons?i=github"></a> |
| Pedro Prado | Desenvolvedor | <a href="https://github.com/PeedroPrado"><img src="https://skillicons.dev/icons?i=github"></a> |

---

<h2>🛠️ Tecnologias Utilizadas</h2>

<p align="center">
  <img src="https://skillicons.dev/icons?i=py,scikitlearn,fastapi,react,ts,docker,githubactions,postgres" />
</p>

- **Machine Learning & Data**: Python, Scikit-Learn, Pandas, NumPy
- **Backend / API**: Python (FastAPI / Flask) ou Node.js (TypeScript)
- **Frontend / Web**: React, TypeScript, Tailwind CSS, Chart.js / Recharts
- **Banco de Dados**: PostgreSQL / MongoDB
- **Cloud & DevOps**: Docker, GitHub Actions (CI/CD), AWS / Cloud Services
- **Documentação API**: OpenAPI / Swagger

---

<h2>📂 Estrutura do Projeto</h2>
