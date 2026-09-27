import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { createGBrainMiddleware } from "./server/gbrain.ts";

export default defineConfig({
  plugins: [
    react(),
    {
      name: "appstract-gbrain-adapter",
      configureServer(server) {
        server.middlewares.use(createGBrainMiddleware());
      },
      configurePreviewServer(server) {
        server.middlewares.use(createGBrainMiddleware());
      },
    },
  ],
  server: { port: 5173, strictPort: true },
  preview: { port: 4173, strictPort: true },
});
