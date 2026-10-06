require("dotenv").config();
const express = require("express");
const cors = require("cors");
const informeRoutes = require("./routes/informe");

const app = express();
// exposedHeaders: para que el navegador pueda leer el nombre del archivo generado.
app.use(cors({ exposedHeaders: ["Content-Disposition"] }));
app.use(express.json());

app.get("/api/health", (req, res) => res.json({ ok: true }));
app.use("/api", informeRoutes);

const PORT = process.env.PORT || 8001;
app.listen(PORT, () => {
  console.log(`Backend escuchando en http://localhost:${PORT}`);
});
