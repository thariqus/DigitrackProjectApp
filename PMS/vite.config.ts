import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import proxyOptions from "./proxyOptions";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  base: "/assets/jh_digitrack/PMS/",
  plugins: [react(), tailwindcss()],
  server: {
    port: 8080,
    host: "0.0.0.0",
    proxy: proxyOptions,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  build: {
    outDir: "../jh_digitrack/public/PMS",
    emptyOutDir: true,
    target: "es2015",
  },
});
