import type { RequestHandler } from "express";

export const requireIsolatedFixtureContext: RequestHandler = (
  _req,
  res,
  next,
) => {
  if (process.env.VNDRLY_ISOLATED_TEST_DB !== "1") {
    res.status(503).json({
      code: "fixture.isolated_test_database_required",
      message:
        "Destructive fixture routes require the isolated test database wrapper.",
    });
    return;
  }

  next();
};
