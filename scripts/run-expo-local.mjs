process.env.VNDRLY_LOAD_ENV_LOCAL = "1";
import "./load-env-local.mjs";
import "./dev-local-defaults.mjs";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const mobileDir = path.resolve(repoRoot, "artifacts/vndrly-mobile");

const child = spawn(
  "pnpm",
  ["exec", "expo", "start", "--localhost"],
  { cwd: mobileDir, stdio: "inherit", shell: true },
);

child.on("exit", (code) => process.exit(code ?? 1));
