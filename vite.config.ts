import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { discoveryPlugin } from "./server/discovery.ts";

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    discoveryPlugin(process.cwd(), {
      ...loadEnv(mode, process.cwd(), ""),
      ...process.env,
    }),
  ],
  build: {
    rollupOptions: {
      input: {
        appstract: "index.html",
        vendor: "apps/vendor-approval/index.html",
      },
    },
  },
  server: { port: 5174, strictPort: true },
  preview: { port: 4174, strictPort: true },
}));
