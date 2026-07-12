import { existsSync, readdirSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const distPath = resolve(dirname(fileURLToPath(import.meta.url)), "../dist");

// Finder can recreate .DS_Store while Vite recursively removes output on an
// external volume. Remove the whole generated tree with Node's retry support,
// then verify it stayed gone before Vite writes fresh assets.
for (let attempt = 1; attempt <= 3 && existsSync(distPath); attempt += 1) {
  rmSync(distPath, {
    recursive: true,
    force: true,
    maxRetries: 10,
    retryDelay: 50,
  });
}

if (existsSync(distPath)) {
  const remaining = readdirSync(distPath).join(", ") || "unknown entries";
  throw new Error(`Could not clean generated dist directory: ${remaining}`);
}
