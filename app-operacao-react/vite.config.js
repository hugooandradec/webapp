import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { PROD_APP_BASE_URL } from "./app.config.js";

export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: command === "serve" ? "/" : PROD_APP_BASE_URL,
}));
