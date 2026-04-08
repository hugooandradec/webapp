import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { getRuntimeBasePath } from "../app.config";
import App from "./App";
import { DialogProvider } from "./components/DialogProvider";
import { ToastProvider } from "./components/ToastProvider";
import { cleanupLegacyPwa } from "./utils/cleanupLegacyPwa";

const APP_BASE_PATH = getRuntimeBasePath();

cleanupLegacyPwa();

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter basename={APP_BASE_PATH || undefined}>
      <ToastProvider>
        <DialogProvider>
          <App />
        </DialogProvider>
      </ToastProvider>
    </BrowserRouter>
  </React.StrictMode>
);
