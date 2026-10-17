import { defineConfig } from "@playwright/test";

try {
  process.loadEnvFile(".env");
} catch {
  // Local env is optional. Tests read only the names they need.
}

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  workers: 1,
  reporter: "line",
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3000",
    viewport: { width: 1280, height: 800 },
  },
});
