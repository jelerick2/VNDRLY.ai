/**
 * Loads repo-root `.env.local` into `process.env` for local development.
 * Does not override variables already set in the shell.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { mapboxEnvPath } from "./secrets-path.mjs";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = resolve(repoRoot, ".env.local");

const forceFromFile = process.env.VNDRLY_LOAD_ENV_LOCAL === "1";

function parseEnvFile(filePath) {
  const out = {};
  if (!existsSync(filePath)) return out;
  for (const line of readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (key) out[key] = value;
  }
  return out;
}

function setEnv(key, value) {
  if (key && value && (process.env[key] === undefined || forceFromFile)) {
    process.env[key] = value;
  }
}

for (const [key, value] of Object.entries(parseEnvFile(envPath))) {
  setEnv(key, value);
}

const mapboxEnv = parseEnvFile(mapboxEnvPath());
const mapboxAccessToken =
  mapboxEnv.MAPBOX_ACCESS_TOKEN ||
  mapboxEnv.MAPBOX_API_KEY ||
  mapboxEnv.api ||
  "";
setEnv("MAPBOX_ACCESS_TOKEN", mapboxAccessToken);
setEnv("VITE_MAPBOX_ACCESS_TOKEN", mapboxAccessToken);
setEnv("EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN", mapboxAccessToken);
