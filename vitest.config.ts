import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    // Use jsdom storage instead of Node 24+ native Web Storage in test workers.
    execArgv: ["--no-experimental-webstorage"],
    setupFiles: "./apps/vendor-approval/src/test/setup.ts",
    include: ["apps/vendor-approval/src/**/*.test.{ts,tsx}", "src/**/*.test.tsx"],
  },
});
