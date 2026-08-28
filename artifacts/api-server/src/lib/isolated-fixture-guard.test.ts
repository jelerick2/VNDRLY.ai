import express from "express";
import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";

import { requireIsolatedFixtureContext } from "./isolated-fixture-guard";

const originalMarker = process.env.VNDRLY_ISOLATED_TEST_DB;

afterEach(() => {
  if (originalMarker === undefined) {
    delete process.env.VNDRLY_ISOLATED_TEST_DB;
  } else {
    process.env.VNDRLY_ISOLATED_TEST_DB = originalMarker;
  }
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
    delete process.env.VNDRLY_ISOLATED_TEST_DB;
    const databaseAction = vi.fn();

    const response = await request(fixtureApp(databaseAction)).post("/fixture");

    expect(response.status).toBe(503);
    expect(response.body.code).toBe("fixture.isolated_test_database_required");
    expect(databaseAction).not.toHaveBeenCalled();
  });

  it("permits the database action only inside the isolated test wrapper", async () => {
    process.env.VNDRLY_ISOLATED_TEST_DB = "1";
    const databaseAction = vi.fn();

    const response = await request(fixtureApp(databaseAction)).post("/fixture");

    expect(response.status).toBe(204);
    expect(databaseAction).toHaveBeenCalledTimes(1);
  });
});
