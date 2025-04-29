const express = require("express");

module.exports = (redisClient) => {
  const router = express.Router();

  // Endpoint para agregar un lugar
  router.post("/", async (req, res) => {
    try {
      console.log("Recibida solicitud POST /api/places:", req.body);
      const { name, groupId, latitude, longitude } = req.body;

      if (!name || !groupId || !latitude || !longitude) {
        console.log("Faltan campos obligatorios:", {
          name,
          groupId,
          latitude,
          longitude,
        });
        return res
          .status(400)
          .json({ error: "Todos los campos son obligatorios" });
      }

      // Validar que el grupo existe
      console.log("Validando existencia del grupo:", groupId);
      const groupExists = await redisClient.hExists("groups", groupId);
      console.log("Resultado de hExists:", groupExists);
      if (!groupExists) {
        return res.status(400).json({ error: "Grupo no válido" });
      }

      // Generar un ID único para el lugar
      console.log("Generando ID único para el lugar...");
      const placeId = await redisClient.incr("place:counter");
      console.log("ID generado:", placeId);

      // Convertir latitud y longitud a números
      console.log("Latitud recibida:", latitude, "Tipo:", typeof latitude);
      console.log("Longitud recibida:", longitude, "Tipo:", typeof longitude);
      const lat = parseFloat(latitude);
      const lon = parseFloat(longitude);
      console.log("Latitud y longitud convertidas:", { lat, lon });

      if (isNaN(lat) || isNaN(lon)) {
        console.log("Valores inválidos después de parseFloat:", { lat, lon });
        return res.status(400).json({ error: "Latitud o longitud inválidas" });
      }

      // Almacenar los datos del lugar
      const placeData = {
        id: placeId,
        name,
        groupId,
        latitude: lat,
        longitude: lon,
      };

      // Guardar en un hash para los detalles del lugar
      console.log("Guardando detalles del lugar en Redis...");
      await redisClient.hSet(`place:${placeId}`, "name", name);
      await redisClient.hSet(`place:${placeId}`, "groupId", groupId);
      await redisClient.hSet(`place:${placeId}`, "latitude", String(lat));
      await redisClient.hSet(`place:${placeId}`, "longitude", String(lon));
      console.log("Detalles del lugar guardados");

      // Depuración: mostrar los valores que se pasarán a geoAdd
      console.log("Valores para geoAdd:", {
        key: `geo:${groupId}`,
        longitude: lon,
        latitude: lat,
        member: placeId.toString(),
      });

      // Agregar al índice geoespacial para el grupo
      console.log("Agregando al índice geoespacial...");
      const geoAddResult = await redisClient.geoAdd(`geo:${groupId}`, [
        {
          longitude: lon,
          latitude: lat,
          member: placeId.toString(),
        },
      ]);
      console.log("Resultado de geoAdd:", geoAddResult);

      console.log("Lugar agregado exitosamente:", placeData);
      res
        .status(201)
        .json({ message: "Lugar agregado exitosamente", place: placeData });
    } catch (error) {
      console.error("Error al agregar lugar:", error);
      res.status(500).json({ error: "Error al agregar lugar" });
    }
  });

  // Endpoint para buscar lugares dentro de un radio (de todos los grupos)
  router.get("/nearby", async (req, res) => {
    try {
      console.log("Recibida solicitud GET /api/places/nearby:", req.query);
      const { latitude, longitude, radius = 5 } = req.query;

      if (!latitude || !longitude) {
        return res
          .status(400)
          .json({ error: "Latitud y longitud son obligatorios" });
      }

      const lat = parseFloat(latitude);
      const lon = parseFloat(longitude);
      const rad = parseFloat(radius);

      if (isNaN(lat) || isNaN(lon) || isNaN(rad)) {
        return res
          .status(400)
          .json({ error: "Latitud, longitud o radio inválidos" });
      }

      // Obtener todos los grupos
      const groupsRaw = await redisClient.hGetAll("groups");
      const groups = Object.entries(groupsRaw).map(([id, name]) => ({
        id,
        name,
      }));
      console.log("Grupos disponibles:", groups);
      if (groups.length === 0) {
        return res.status(404).json({ error: "No hay grupos disponibles" });
      }

      // Buscar lugares cercanos en cada grupo
      let allPlaces = [];
      for (const group of groups) {
        const groupId = group.id;
        const geoKey = `geo:${groupId}`;

        // Verificar si el índice geoespacial existe
        const exists = await redisClient.exists(geoKey);
        if (!exists) continue;

        // Buscar lugares dentro del radio (en kilómetros)
        const places = await redisClient.geoSearchWith(
          geoKey,
          { latitude: lat, longitude: lon },
          { radius: rad, unit: "km" },
          ["WITHDIST"]
        );

        // Mapear los resultados para incluir detalles de los lugares
        const nearbyPlaces = await Promise.all(
          places.map(async (place) => {
            const placeId = place.member;
            const distance = parseFloat(place.distance);
            const details = await redisClient.hGetAll(`place:${placeId}`);
            const groupName = group.name; // Aseguramos que sea una cadena
            console.log(
              "Asignando groupName:",
              groupName,
              "para placeId:",
              placeId
            );
            return {
              id: placeId,
              name: details.name,
              groupId: details.groupId,
              groupName: groupName,
              latitude: parseFloat(details.latitude),
              longitude: parseFloat(details.longitude),
              distance: distance,
            };
          })
        );

        allPlaces = allPlaces.concat(nearbyPlaces);
      }

      // Ordenar los lugares por distancia (de menor a mayor)
      allPlaces.sort((a, b) => a.distance - b.distance);
      console.log("Lugares encontrados:", allPlaces);

      res.status(200).json(allPlaces);
    } catch (error) {
      console.error("Error al buscar lugares:", error);
      res.status(500).json({ error: "Error al buscar lugares" });
    }
  });

  return router;
};
