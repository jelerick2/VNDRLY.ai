# GitHub VPS Web Deployment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every successful `main` web build publish the generated VNDRLY web files to the existing GoDaddy VPS.

**Architecture:** Extend the existing GitHub Actions `Publish` workflow with a guarded deployment job that runs only after the build job succeeds. The job connects with encrypted repository secrets, verifies that the known web destination exists and is writable, and then synchronizes only `artifacts/vndrly/dist/public`; it does not alter the database, production environment file, API service, nginx configuration, or unrelated server files.

**Tech Stack:** GitHub Actions, pnpm, Vite, OpenSSH, rsync, Node.js built-in test runner.

**Spec:** User instruction in the active conversation to deploy the merged Gate microphone update live on `vndrly.ai`.

## Global Constraints

- Never print VPS credentials or write them to the repository.
- Read credentials only from GitHub Actions repository secrets.
- Do not touch the database or `/var/www/vndrly/.env.production`.
- Verify SSH connectivity and destination write access before synchronization.
- Deploy only after the existing web and API builds pass.
- Verify the public `/gate` bundle after the workflow completes.

---

### Task 1: Specify the deployment workflow contract

**Files:**
- Create: `scripts/tests/publish-workflow.test.mjs`
- Test: `scripts/tests/publish-workflow.test.mjs`

**Interfaces:**
- Consumes: `.github/workflows/publish.yml` as UTF-8 text.
- Produces: executable assertions for the required deployment guardrails and commands.

- [ ] **Step 1: Write the failing test**

Create a Node test that asserts the workflow has a `deploy-web` job, depends on `build`, references `VPS_HOST`, `VPS_USER`, `VPS_PASSWORD`, and `VPS_PORT`, verifies `/var/www/vndrly/artifacts/vndrly/dist/public`, synchronizes the built public directory with rsync, and never references `.env.production` or database commands.

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test scripts/tests/publish-workflow.test.mjs`

Expected: FAIL because `.github/workflows/publish.yml` has no `deploy-web` job.

- [ ] **Step 3: Commit**

Do not commit until Task 2 is green so the test and implementation ship together.

### Task 2: Add guarded web deployment

**Files:**
- Modify: `.github/workflows/publish.yml`
- Test: `scripts/tests/publish-workflow.test.mjs`

**Interfaces:**
- Consumes: `VPS_HOST`, `VPS_USER`, `VPS_PASSWORD`, and `VPS_PORT` GitHub Actions secrets.
- Produces: synchronized static web output at `/var/www/vndrly/artifacts/vndrly/dist/public/`.

- [ ] **Step 1: Implement the minimal workflow**

Add `workflow_dispatch`, give the workflow read-only contents permission, retain the existing build job, upload the built web directory as an artifact, and add a `deploy-web` job that downloads it. Fail fast if a required secret is absent. Install `sshpass` and `rsync`, verify the exact destination directory is writable over SSH, then run rsync from the downloaded artifact to that destination.

- [ ] **Step 2: Run test to verify it passes**

Run: `node --test scripts/tests/publish-workflow.test.mjs`

Expected: PASS.

- [ ] **Step 3: Validate workflow syntax**

Run a YAML parse through the repository's available JavaScript YAML package and confirm the parsed workflow contains both `build` and `deploy-web` jobs.

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/publish.yml scripts/tests/publish-workflow.test.mjs docs/superpowers/plans/2026-08-26-github-vps-web-deployment.md
git commit -m "ci: deploy web build to VPS"
```

### Task 3: Verify, publish, and observe production

**Files:**
- Verify only; no planned file modifications.

**Interfaces:**
- Consumes: committed workflow and GitHub Actions encrypted secrets.
- Produces: a completed Actions run and fresh public Gate bundle.

- [ ] **Step 1: Run repository validation**

Run the workflow contract test, `pnpm --filter @workspace/vndrly run typecheck`, and `pnpm --filter @workspace/vndrly run build`.

- [ ] **Step 2: Push branch and main**

Push `codex/github-vps-web-deploy`, then fast-forward or merge the verified commit into `main` without force-pushing.

- [ ] **Step 3: Inspect the Actions run**

Use the GitHub API to locate the `Publish` run for the pushed commit. If the SSH preflight fails, stop and report the exact non-secret error class without changing server configuration.

- [ ] **Step 4: Verify production**

Fetch `https://vndrly.ai/gate` without cache, identify the main bundle, and assert it contains the new Gate voice-image markers. Run `node scripts/check-live.mjs` to confirm public health checks.

