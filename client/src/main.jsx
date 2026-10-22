// client/src/main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router";

import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import "leaflet/dist/leaflet.css";
import "./assets/styles/index.css";

import App from "./App.jsx";
import { DatabaseProvider } from './context/DatabaseProvider.jsx';
import RouteAccessibility from './routes/RouteAccessibility.jsx';

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <RouteAccessibility />
      <DatabaseProvider><App /></DatabaseProvider>
    </BrowserRouter>
  </React.StrictMode>
);
