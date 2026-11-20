// client/src/main.jsx
// Điểm khởi chạy của ứng dụng: nạp CSS toàn cục và render App vào #root.
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

// Bọc App trong Router và DatabaseProvider để mọi trang dùng chung điều hướng và dữ liệu catalog/người dùng;
// RouteAccessibility đặt ngoài Provider vì chỉ cần thông tin đường dẫn để cập nhật tiêu đề trang.
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <RouteAccessibility />
      <DatabaseProvider><App /></DatabaseProvider>
    </BrowserRouter>
  </React.StrictMode>
);
