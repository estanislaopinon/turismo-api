import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles.css";

// Asegurarnos de que el DOM esté cargado antes de renderizar
document.addEventListener("DOMContentLoaded", () => {
  const container = document.getElementById("root");
  if (!container) {
    console.error('No se encontró el elemento con id="root"');
    return;
  }
  const root = createRoot(container);
  root.render(<App />);
});
