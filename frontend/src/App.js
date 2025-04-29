import React, { useEffect, useState } from "react";
import axios from "axios";
import "./styles.css";

function App() {
  const [groups, setGroups] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    name: "",
    groupId: "",
    latitude: "",
    longitude: "",
  });
  const [formError, setFormError] = useState(null);
  const [formSuccess, setFormSuccess] = useState(null);
  const [searchData, setSearchData] = useState({
    address: "",
  });
  const [searchResults, setSearchResults] = useState([]);
  const [searchError, setSearchError] = useState(null);
  const [selectedPlaceId, setSelectedPlaceId] = useState("");
  const [distanceResult, setDistanceResult] = useState(null);

  useEffect(() => {
    axios
      .get("http://localhost:5000/api/groups")
      .then((response) => {
        console.log("Datos recibidos:", response.data);
        setGroups(response.data);
        setLoading(false);
      })
      .catch((err) => {
        setError("Error al cargar los grupos: " + err.message);
        console.error("Error completo:", err);
        setLoading(false);
      });
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (
      !formData.name ||
      !formData.groupId ||
      !formData.latitude ||
      !formData.longitude
    ) {
      setFormError("Todos los campos son obligatorios");
      return;
    }

    const dataToSend = {
      name: formData.name,
      groupId: formData.groupId,
      latitude: parseFloat(formData.latitude),
      longitude: parseFloat(formData.longitude),
    };

    if (isNaN(dataToSend.latitude) || isNaN(dataToSend.longitude)) {
      setFormError("Latitud o longitud inválidas");
      return;
    }

    console.log("Datos enviados al backend:", dataToSend);
    axios
      .post("http://localhost:5000/api/places", dataToSend)
      .then((response) => {
        console.log("Respuesta del backend:", response.data);
        setFormSuccess("Lugar agregado exitosamente");
        setFormData({ name: "", groupId: "", latitude: "", longitude: "" });
      })
      .catch((err) => {
        setFormError("Error al agregar el lugar: " + err.message);
        console.error("Error en la solicitud:", err);
      });
  };

  const handleSearchInputChange = (e) => {
    const { name, value } = e.target;
    setSearchData({ ...searchData, [name]: value });
  };

  const geocodeAddress = async (address) => {
    try {
      const response = await axios.get(
        "https://nominatim.openstreetmap.org/search",
        {
          params: {
            q: address,
            format: "json",
            limit: 1,
          },
          headers: {
            "User-Agent": "turismo-api/1.0 (contact@example.com)",
          },
        }
      );
      console.log("Respuesta de Nominatim:", response.data);
      if (response.data.length === 0) {
        throw new Error("No se encontraron resultados para la dirección");
      }
      const { lat, lon } = response.data[0];
      return { latitude: parseFloat(lat), longitude: parseFloat(lon) };
    } catch (error) {
      console.error("Error al geocodificar la dirección:", error);
      throw error;
    }
  };

  const handleSearchSubmit = async (e) => {
    e.preventDefault();
    setSearchError(null);
    setSearchResults([]);
    setSelectedPlaceId("");
    setDistanceResult(null);

    if (!searchData.address) {
      setSearchError("La dirección es obligatoria");
      return;
    }

    try {
      const { latitude, longitude } = await geocodeAddress(searchData.address);
      console.log("Coordenadas obtenidas:", { latitude, longitude });

      const params = {
        latitude,
        longitude,
      };

      if (isNaN(params.latitude) || isNaN(params.longitude)) {
        setSearchError(
          "No se pudieron obtener coordenadas válidas para la dirección"
        );
        return;
      }

      console.log("Parámetros de búsqueda:", params);
      const response = await axios.get(
        "http://localhost:5000/api/places/nearby",
        { params }
      );
      console.log("Resultados de la búsqueda:", response.data);
      setSearchResults(response.data);
    } catch (err) {
      setSearchError("Error al buscar lugares: " + err.message);
      console.error("Error en la búsqueda:", err);
    }
  };

  const handlePlaceSelectionChange = (e) => {
    setSelectedPlaceId(e.target.value);
    setDistanceResult(null);
  };

  const handleDistanceSubmit = (e) => {
    e.preventDefault();
    if (!selectedPlaceId) {
      setSearchError("Debes seleccionar un lugar");
      return;
    }

    const selectedPlace = searchResults.find(
      (place) => place.id === selectedPlaceId
    );
    if (selectedPlace) {
      setDistanceResult({
        placeName: selectedPlace.name,
        distance: selectedPlace.distance,
      });
    }
  };

  return (
    <div className="container">
      <h1>Puntos de Interés Turístico</h1>
      {loading && <p>Cargando...</p>}
      {error && <p className="error">{error}</p>}
      {!loading && !error && groups.length === 0 && (
        <p>No se encontraron grupos.</p>
      )}
      {!loading && !error && groups.length > 0 && (
        <>
          <h2>Grupos de Interés</h2>
          <ul className="group-list">
            {groups.map((group) => (
              <li key={group.id} className="group-item">
                {group.name}
              </li>
            ))}
          </ul>
          <h2>Agregar Nuevo Lugar</h2>
          <form onSubmit={handleSubmit} className="form">
            <div className="form-group">
              <label>Nombre del Lugar:</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label>Grupo:</label>
              <select
                name="groupId"
                value={formData.groupId}
                onChange={handleInputChange}
                className="form-input"
              >
                <option value="">Selecciona un grupo</option>
                {groups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Latitud:</label>
              <input
                type="number"
                name="latitude"
                value={formData.latitude}
                onChange={handleInputChange}
                className="form-input"
                step="any"
              />
            </div>
            <div className="form-group">
              <label>Longitud:</label>
              <input
                type="number"
                name="longitude"
                value={formData.longitude}
                onChange={handleInputChange}
                className="form-input"
                step="any"
              />
            </div>
            {formError && <p className="error">{formError}</p>}
            {formSuccess && <p className="success">{formSuccess}</p>}
            <button type="submit" className="form-button">
              Agregar Lugar
            </button>
          </form>
          <h2>Buscar Lugares Cercanos (Radio de 5 km)</h2>
          <form onSubmit={handleSearchSubmit} className="form">
            <div className="form-group">
              <label>Dirección:</label>
              <input
                type="text"
                name="address"
                value={searchData.address}
                onChange={handleSearchInputChange}
                className="form-input"
                placeholder="Ej: Gualeguaychú, Entre Ríos, Argentina"
              />
            </div>
            {searchError && <p className="error">{searchError}</p>}
            <button type="submit" className="form-button">
              Buscar Lugares
            </button>
          </form>
          {searchResults.length > 0 && (
            <>
              <h3>Lugares Encontrados:</h3>
              <table className="places-table">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Distancia (km)</th>
                  </tr>
                </thead>
                <tbody>
                  {searchResults.map((place) => (
                    <tr key={place.id}>
                      <td>{place.name}</td>
                      <td>{place.distance.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <h3>Calcular Distancia a un Lugar:</h3>
              <form onSubmit={handleDistanceSubmit} className="form">
                <div className="form-group">
                  <label>Selecciona un Lugar:</label>
                  <select
                    value={selectedPlaceId}
                    onChange={handlePlaceSelectionChange}
                    className="form-input"
                  >
                    <option value="">Selecciona un lugar</option>
                    {searchResults.map((place) => (
                      <option key={place.id} value={place.id}>
                        {place.name} (Distancia: {place.distance.toFixed(2)} km)
                      </option>
                    ))}
                  </select>
                </div>
                <button type="submit" className="form-button">
                  Calcular Distancia
                </button>
              </form>
              {distanceResult && (
                <>
                  <h3>Distancia Calculada:</h3>
                  <p>
                    Distancia desde tu ubicación hasta{" "}
                    {distanceResult.placeName}:{" "}
                    {distanceResult.distance.toFixed(2)} km
                  </p>
                </>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

export default App;
