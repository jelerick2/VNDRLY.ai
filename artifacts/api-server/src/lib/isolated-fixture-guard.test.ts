import express from "express";
import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";

import { requireIsolatedFixtureContext } from "./isolated-fixture-guard";

const originalEnvironment = {
  DATABASE_URL: process.env.DATABASE_URL,
  LISTEN_NOTIFY_DATABASE_URL: process.env.LISTEN_NOTIFY_DATABASE_URL,
  PGPORT: process.env.PGPORT,
  TEST_DATABASE_URL: process.env.TEST_DATABASE_URL,
  VNDRLY_ISOLATED_TEST_DB: process.env.VNDRLY_ISOLATED_TEST_DB,
};

function restoreEnvironment(key: keyof typeof originalEnvironment): void {
  const original = originalEnvironment[key];
  if (original === undefined) {
    delete process.env[key];
  } else {
    process.env[key] = original;
  }
}

afterEach(() => {
  restoreEnvironment("DATABASE_URL");
  restoreEnvironment("LISTEN_NOTIFY_DATABASE_URL");
  restoreEnvironment("PGPORT");
  restoreEnvironment("TEST_DATABASE_URL");
  restoreEnvironment("VNDRLY_ISOLATED_TEST_DB");
});

function fixtureApp(databaseAction: () => void) {
  const app = express();
  app.post("/fixture", requireIsolatedFixtureContext, (_req, res) => {
    databaseAction();
    res.status(204).send();
  });
  return app;
}

describe("requireIsolatedFixtureContext", () => {
  it("refuses before any database action when the isolated marker is absent", async () => {
    delete process.env.DATABASE_URL;
    delete process.env.LISTEN_NOTIFY_DATABASE_URL;
    delete process.env.TEST_DATABASE_URL;
    delete process.env.VNDRLY_ISOLATED_TEST_DB;
    const databaseAction = vi.fn();

    const response = await request(fixtureApp(databaseAction)).post("/fixture");

    expect(response.status).toBe(503);
    expect(response.body.code).toBe("fixture.isolated_test_database_required");
    expect(databaseAction).not.toHaveBeenCalled();
  });

  it("refuses before any database action when only the marker is present", async () => {
    delete process.env.DATABASE_URL;
    delete process.env.LISTEN_NOTIFY_DATABASE_URL;
    delete process.env.TEST_DATABASE_URL;
    process.env.VNDRLY_ISOLATED_TEST_DB = "1";
    const databaseAction = vi.fn();

    const response = await request(fixtureApp(databaseAction)).post("/fixture");

    expect(response.status).toBe(503);
    expect(databaseAction).not.toHaveBeenCalled();
  });

  it("refuses before any database action when the matching target lacks _test", async () => {
    process.env.VNDRLY_ISOLATED_TEST_DB = "1";
    process.env.DATABASE_URL =
      "postgresql://runner:secret@isolated.example.test:5432/vndrly";
    process.env.TEST_DATABASE_URL = process.env.DATABASE_URL;
    const databaseAction = vi.fn();

    const response = await request(fixtureApp(databaseAction)).post("/fixture");

    expect(response.status).toBe(503);
    expect(databaseAction).not.toHaveBeenCalled();
  });

  it("refuses before any database action when normalized targets differ", async () => {
    process.env.VNDRLY_ISOLATED_TEST_DB = "1";
    process.env.DATABASE_URL =
      "postgresql://runner:secret@one.example.test:5432/vndrly_test";
    process.env.TEST_DATABASE_URL =
      "postgresql://runner:secret@two.example.test:5432/vndrly_test";
    const databaseAction = vi.fn();

    const response = await request(fixtureApp(databaseAction)).post("/fixture");

    expect(response.status).toBe(503);
    expect(databaseAction).not.toHaveBeenCalled();
  });

  it("refuses query parameters with encoded controls before any database action", async () => {
    process.env.VNDRLY_ISOLATED_TEST_DB = "1";
    process.env.DATABASE_URL =
      "postgresql://runner:secret@isolated.example.test:5432/vndrly_test?application_name=%00evil";
    process.env.TEST_DATABASE_URL = process.env.DATABASE_URL;
    const databaseAction = vi.fn();

    const response = await request(fixtureApp(databaseAction)).post("/fixture");

    expect(response.status).toBe(503);
    expect(databaseAction).not.toHaveBeenCalled();
  });

  it("refuses an omitted URL port even when PGPORT supplies one", async () => {
    process.env.VNDRLY_ISOLATED_TEST_DB = "1";
    process.env.PGPORT = "5432";
    process.env.DATABASE_URL =
      "postgresql://runner:secret@isolated.example.test/vndrly_test";
    process.env.TEST_DATABASE_URL = process.env.DATABASE_URL;
    const databaseAction = vi.fn();

    const response = await request(fixtureApp(databaseAction)).post("/fixture");

    expect(response.status).toBe(503);
    expect(databaseAction).not.toHaveBeenCalled();
  });

  it("permits the database action when the marker and exact safe URLs are present", async () => {
    process.env.VNDRLY_ISOLATED_TEST_DB = "1";
    process.env.DATABASE_URL =
      "postgres://runner:first@ISOLATED.EXAMPLE.TEST:5432/vndrly_test";
    process.env.TEST_DATABASE_URL =
      "postgresql://runner:second@isolated.example.test:5432/vndrly_test";
    const databaseAction = vi.fn();

    const response = await request(fixtureApp(databaseAction)).post("/fixture");

    expect(response.status).toBe(204);
    expect(databaseAction).toHaveBeenCalledTimes(1);
  });
});
