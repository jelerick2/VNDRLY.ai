process.env.VNDRLY_LOAD_ENV_LOCAL = "1";
import "./load-env-local.mjs";
import "./dev-local-defaults.mjs";
// API uses PORT=8080 from .env.local; Vite dev server stays on 5173.
process.env.PORT = "5173";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const webDir = path.resolve(repoRoot, "artifacts/vndrly");

const child = spawn(
  "pnpm",
  ["exec", "vite", "--config", "vite.config.ts", "--host", "0.0.0.0"],
  { cwd: webDir, stdio: "inherit", shell: true },
);

child.on("exit", (code) => process.exit(code ?? 1));
