#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function git(args) {
  return execFileSync("git", args, {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function collectDiffFiles() {
  const files = new Set();

  for (const args of [
    ["diff", "--name-only"],
    ["diff", "--name-only", "--cached"],
    ["ls-files", "--others", "--exclude-standard"],
  ]) {
    const out = git(args);
    for (const file of out.split(/\r?\n/)) {
      if (file.trim()) files.add(file.trim().replaceAll("\\", "/"));
    }
  }

  return [...files].sort();
}

const nativeExact = new Set([
  "artifacts/vndrly-mobile/app.json",
  "artifacts/vndrly-mobile/eas.json",
  "artifacts/vndrly-mobile/metro.config.js",
  "artifacts/vndrly-mobile/babel.config.js",
  "pnpm-lock.yaml",
  "eas.json",
]);

const nativePrefixes = [
  "artifacts/vndrly-mobile/plugins/",
  "artifacts/vndrly-mobile/ios/",
  "artifacts/vndrly-mobile/android/",
  "artifacts/vndrly-mobile/assets/icons/",
  "artifacts/vndrly-mobile/assets/sounds/",
];

const nativeSuffixes = [
  ".p8",
  ".mobileprovision",
  ".entitlements",
  ".keystore",
  ".jks",
];

function readJsonAtRef(ref, file) {
  try {
    return JSON.parse(git(["show", `${ref}:${file}`]));
  } catch {
    return null;
  }
}

function readWorkingJson(file) {
  try {
    return JSON.parse(fs.readFileSync(path.join(repoRoot, file), "utf8"));
  } catch {
    return null;
  }
}

function packageDependencyChanged(file) {
  const before = readJsonAtRef("HEAD", file);
  const after = readWorkingJson(file);
  if (!before || !after) return true;

  const keys = [
    "dependencies",
    "devDependencies",
    "peerDependencies",
    "optionalDependencies",
    "resolutions",
    "overrides",
    "packageManager",
  ];

  return keys.some((key) => JSON.stringify(before[key] ?? null) !== JSON.stringify(after[key] ?? null));
}

function isNativeImpact(file) {
  if (file === "package.json" || file === "artifacts/vndrly-mobile/package.json") {
    return packageDependencyChanged(file);
  }
  if (nativeExact.has(file)) return true;
  if (nativePrefixes.some((prefix) => file.startsWith(prefix))) return true;
  return nativeSuffixes.some((suffix) => file.endsWith(suffix));
}

const files = collectDiffFiles();
const mobileFiles = files.filter(
  (file) =>
    file.startsWith("artifacts/vndrly-mobile/") ||
    file.startsWith("lib/") ||
    file.startsWith("packages/") ||
    file === "pnpm-lock.yaml" ||
    file === "package.json",
);
const nativeImpactFiles = mobileFiles.filter(isNativeImpact);

if (process.argv.includes("--json")) {
  console.log(
    JSON.stringify(
      {
        files,
        mobileFiles,
        nativeImpactFiles,
        requiresNativeBuild: nativeImpactFiles.length > 0,
      },
      null,
      2,
    ),
  );
} else {
  if (mobileFiles.length === 0) {
    console.log("No mobile-impacting local changes detected.");
  } else {
    console.log("Mobile-impacting local changes:");
    for (const file of mobileFiles) console.log(`  - ${file}`);
  }

  if (nativeImpactFiles.length > 0) {
    console.log("");
    console.log("Native/TestFlight-required changes:");
    for (const file of nativeImpactFiles) console.log(`  - ${file}`);
  }
}

process.exit(nativeImpactFiles.length > 0 ? 2 : 0);
