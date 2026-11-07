import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// GitHub Pages project sites are served from https://<user>.github.io/<repository>/,
// so the asset paths must include the repository name. GitHub Actions exposes the
// repository as GITHUB_REPOSITORY ("<owner>/<repository>"); local builds fall back to
// relative asset paths, which also work on GitHub Pages and on any local static server.
const repositoryName = process.env.GITHUB_REPOSITORY?.split("/")[1];

export default defineConfig({
  base: repositoryName ? `/${repositoryName}/` : "./",
  plugins: [react()],
  build: {
    outDir: "dist",
    // Keep the output readable for a small static site.
    sourcemap: false,
  },
  test: {
    include: ["tests/**/*.test.{ts,tsx}"],
  },
});
