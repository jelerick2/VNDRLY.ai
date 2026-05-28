process.env.VNDRLY_LOAD_ENV_LOCAL = "1";
import "./load-env-local.mjs";
import "./dev-local-defaults.mjs";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const apiDir = path.resolve(repoRoot, "artifacts/api-server");

const child = spawn(
  "node",
  ["--enable-source-maps", "./dist/index.mjs"],
  { cwd: apiDir, stdio: "inherit", shell: true, env: process.env },
);

child.on("exit", (code) => process.exit(code ?? 1));
