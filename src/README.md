## 1. Pré-requisitos

- Node.js
- PostgreSQL
- Git
- Arquivo CSV do ENEM 2023

## 3. Configurar o backend

Entre na pasta do backend e instale as dependências:

```bash
cd backend
npm install
```

Crie um arquivo `.env` dentro da pasta `backend`:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=farol_ia
DB_USER=postgres
DB_PASSWORD=SUA_SENHA
```

Substitua `SUA_SENHA` pela senha do seu PostgreSQL.

## 4. Configurar o banco de dados

Com o PostgreSQL iniciado, execute:

```bash
npm run init-db
```

### Importar o CSV do ENEM

Coloque o arquivo CSV no seguinte caminho:

```text
backend/data/enem_2023.csv
```

Execute:

```bash
npm run import-enem
```

**Observação:** a importação precisa ser realizada apenas na configuração inicial. Executá-la novamente substitui os dados anteriores da tabela do ENEM.

## 5. Executar o projeto

Abra dois terminais.

**Terminal 1 — Backend**

```bash
cd backend
npm run dev
```

**Terminal 2 — Frontend**

```bash
cd frontend
npm install
npm run dev
```

Acesse o site:

http://localhost:5173

## 6. Testar a conexão

Para verificar se a API está funcionando:

http://localhost:3000/api/health

Para consultar os dados do ENEM:

http://localhost:3000/api/enem/resumo

## 7. Próximas execuções

Depois de instalar as dependências, criar o banco e importar o CSV, basta iniciar o PostgreSQL e executar:

**Backend:**

```bash
cd backend
npm run dev
```

**Frontend (outro terminal):**

```bash
cd frontend
npm run dev
```

Não é necessário importar o CSV novamente.

---

**Farol.IA — Equipe CapyDev | FATEC Jacareí**

*As funcionalidades de Machine Learning ainda estão em desenvolvimento.*
