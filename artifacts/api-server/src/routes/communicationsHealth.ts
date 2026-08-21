import { Router, type IRouter } from "express";
import { buildCommunicationsHealth } from "../lib/communications-health";
import { requireAdmin } from "../lib/session";

const router: IRouter = Router();

router.get("/admin/communications-health", requireAdmin, (_req, res): void => {
  res.json(buildCommunicationsHealth());
});

export default router;
