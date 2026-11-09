import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

const repositoryName = process.env.GITHUB_REPOSITORY?.split("/")[1];

export default defineConfig({
  base: repositoryName ? `/${repositoryName}/` : "./",
  plugins: [react()],
  build: {
    outDir: "dist",
    sourcemap: false,
  },
  test: {
    include: ["tests/**/*.test.{ts,tsx}"],
  },
});
