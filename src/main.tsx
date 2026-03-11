import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error('Root element with id "root" was not found.');
}

window.addEventListener("error", (event) => {
  console.error("Global error message:", event.message);
  console.error("Global error object:", event.error);
  console.error("Global error stack:", event.error?.stack);
});

window.addEventListener("unhandledrejection", (event) => {
  console.error("Unhandled rejection reason:", event.reason);
});

createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);