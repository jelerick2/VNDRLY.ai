#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const FULL_SHA = /\b([0-9a-f]{40})\b/i;
const SHORT_SHA = /\b([0-9a-f]{7,39})\b/i;

function isGitSha(value) {
  return typeof value === "string" && /^[0-9a-f]{7,40}$/i.test(value.trim());
}

function shaFromMessage(message) {
  if (typeof message !== "string" || !message.trim()) return null;
  const full = message.match(FULL_SHA);
  if (full) return full[1];
  const short = message.match(SHORT_SHA);
  return short ? short[1] : null;
}

export function resolveProductionRuntimeCommit(builds) {
  if (!Array.isArray(builds) || builds.length === 0) {
    throw new Error("No finished production iOS builds were returned.");
  }

  const build = builds[0];
  const recorded = typeof build?.gitCommitHash === "string" ? build.gitCommitHash.trim() : "";
  if (isGitSha(recorded)) return recorded;

  const fromMessage = shaFromMessage(build?.message);
  if (fromMessage) return fromMessage;

  throw new Error(
    "Latest production iOS build has no gitCommitHash and no git SHA in its message. CI TestFlight must record github.sha on the EAS build message.",
  );
}

function main(argv = process.argv.slice(2)) {
  const file = argv[0];
  if (!file) {
    throw new Error("Usage: node scripts/eas-production-runtime-commit.mjs <builds.json>");
  }
  const builds = JSON.parse(fs.readFileSync(file, "utf8"));
  process.stdout.write(resolveProductionRuntimeCommit(builds));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(2);
  }
}
