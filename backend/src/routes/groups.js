const express = require("express");

module.exports = (redisClient) => {
  const router = express.Router();

  router.get("/", async (req, res) => {
    try {
      const groupsExist = await redisClient.exists("groups");
      if (!groupsExist) {
        const groups = [
          { id: "cervecerias", name: "Cervecerías Artesanales" },
          { id: "universidades", name: "Universidades" },
          { id: "farmacias", name: "Farmacias" },
          { id: "emergencias", name: "Centros de Atención de Emergencias" },
          { id: "supermercados", name: "Supermercados" },
        ];

        const groupData = {};
        groups.forEach((group) => {
          groupData[group.id] = JSON.stringify({
            id: group.id,
            name: group.name,
          });
        });

        await redisClient.hSet("groups", groupData);
      }

      const groupEntries = await redisClient.hGetAll("groups");
      const groups = Object.values(groupEntries).map((entry) =>
        JSON.parse(entry)
      );
      res.json(groups);
    } catch (error) {
      console.error("Error al obtener grupos:", error);
      res.status(500).json({ error: "Error al obtener grupos" });
    }
  });

  return router;
};
