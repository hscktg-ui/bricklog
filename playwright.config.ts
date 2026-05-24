import { defineConfig } from "playwright/test";

export default defineConfig({
  testDir: "./tests",
  timeout: 120_000,
  retries: 0,
  use: {
    baseURL: process.env.BASE_URL || "http://localhost:3005",
    trace: "off",
  },
});
