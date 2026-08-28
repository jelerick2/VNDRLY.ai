import type { RequestHandler } from "express";
import { assertIsolatedTestDatabaseEnvironment } from "../../../../scripts/e2e-isolation.mjs";

export const requireIsolatedFixtureContext: RequestHandler = (
  _req,
  res,
  next,
) => {
  try {
    assertIsolatedTestDatabaseEnvironment(process.env);
  } catch {
    res.status(503).json({
      code: "fixture.isolated_test_database_required",
      message:
        "Destructive fixture routes require the exact isolated _test database target supplied by the wrapper.",
    });
    return;
  }

  next();
};
