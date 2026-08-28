import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { copyFile, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const sourceScript = fileURLToPath(
  new URL("../mobile-release-impact.mjs", import.meta.url),
);

function git(cwd, ...args) {
  return execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
}

async function createRepo() {
  const root = await mkdtemp(path.join(tmpdir(), "vndrly-release-impact-"));
  await mkdir(path.join(root, "scripts"), { recursive: true });
  await mkdir(path.join(root, "artifacts/vndrly-mobile/app"), {
    recursive: true,
  });
  await copyFile(sourceScript, path.join(root, "scripts/mobile-release-impact.mjs"));
  git(root, "init", "--quiet");
  git(root, "config", "user.name", "Test");
  git(root, "config", "user.email", "test@example.com");
  await writeFile(
    path.join(root, "artifacts/vndrly-mobile/app/gate.tsx"),
    "export const gate = 1;\n",
  );
  await writeFile(
    path.join(root, "artifacts/vndrly-mobile/package.json"),
    '{"dependencies":{"expo":"54.0.0"}}\n',
  );
  git(root, "add", ".");
  git(root, "commit", "--quiet", "-m", "baseline");
  return root;
}

function inspect(root, baseRef) {
  return spawnSync(
    process.execPath,
    ["scripts/mobile-release-impact.mjs", "--base-ref", baseRef, "--json"],
    { cwd: root, encoding: "utf8" },
  );
}

test("base-ref includes committed JavaScript changes in OTA analysis", async () => {
  const root = await createRepo();
  try {
    await writeFile(
      path.join(root, "artifacts/vndrly-mobile/app/gate.tsx"),
      "export const gate = 2;\n",
    );
    git(root, "add", ".");
    git(root, "commit", "--quiet", "-m", "mobile js fix");

    const result = inspect(root, "HEAD^");
    assert.equal(result.status, 0, result.stderr);
    const report = JSON.parse(result.stdout);
    assert.deepEqual(report.mobileFiles, [
      "artifacts/vndrly-mobile/app/gate.tsx",
    ]);
    assert.equal(report.requiresNativeBuild, false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("base-ref rejects committed native configuration changes", async () => {
  const root = await createRepo();
  try {
    await writeFile(
      path.join(root, "artifacts/vndrly-mobile/app.json"),
      '{"expo":{"version":"1.0.1"}}\n',
    );
    git(root, "add", ".");
    git(root, "commit", "--quiet", "-m", "native config change");

    const result = inspect(root, "HEAD^");
    assert.equal(result.status, 2, result.stderr);
    const report = JSON.parse(result.stdout);
    assert.deepEqual(report.nativeImpactFiles, [
      "artifacts/vndrly-mobile/app.json",
    ]);
    assert.equal(report.requiresNativeBuild, true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("base-ref rejects committed native dependency changes", async () => {
  const root = await createRepo();
  try {
    await writeFile(
      path.join(root, "artifacts/vndrly-mobile/package.json"),
      '{"dependencies":{"expo":"54.0.1"}}\n',
    );
    git(root, "add", ".");
    git(root, "commit", "--quiet", "-m", "native dependency change");

    const result = inspect(root, "HEAD^");
    assert.equal(result.status, 2, result.stderr);
    const report = JSON.parse(result.stdout);
    assert.deepEqual(report.nativeImpactFiles, [
      "artifacts/vndrly-mobile/package.json",
    ]);
    assert.equal(report.requiresNativeBuild, true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
