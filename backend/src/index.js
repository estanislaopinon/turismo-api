const express = require("express");
const redis = require("redis");
const cors = require("cors");
const groupsRouter = require("./routes/groups");
const placesRouter = require("./routes/places");

const app = express();
app.use(cors());
app.use(express.json());

const redisClient = redis.createClient({
  url: `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`,
});

redisClient.on("error", (err) => console.error("Error en Redis:", err));
redisClient.connect().then(() => console.log("Conectado a Redis"));

app.use("/api/groups", groupsRouter(redisClient));
app.use("/api/places", placesRouter(redisClient));

// Ruta de prueba para confirmar que el servidor está funcionando
app.get("/health", (req, res) => {
  res.status(200).json({ message: "Servidor funcionando correctamente" });
});

app.listen(5000, () => {
  console.log("Backend corriendo en puerto 5000");
});
