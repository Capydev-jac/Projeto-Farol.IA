
import app from "./app.js";

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Farol.IA API disponível em http://localhost:${PORT}`);
});
