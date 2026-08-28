import type { Request, Response } from "express";

import { createRateLimiter, type RateLimitResult } from "./rate-limit-factory";

type RateLimitIdentity = { userId: number; role?: string | null } | null;

const MESSAGE =
  "Too many plate-state recommendation requests. Please wait briefly and try again.";
const ERROR_CODE = "preferred_plate_states.rate_limited";

const clientLimiter = createRateLimiter({
  resourcePrefix: "PREFERRED_PLATE_STATES",
  errorCode: ERROR_CODE,
  logKind: "preferred_plate_states.rate_limit.trip",
  defaultMax: 30,
  defaultWindowMs: 10_000,
  message: MESSAGE,
});

const globalLimiter = createRateLimiter({
  resourcePrefix: "PREFERRED_PLATE_STATES_GLOBAL",
  errorCode: ERROR_CODE,
  logKind: "preferred_plate_states.global_rate_limit.trip",
  defaultMax: 300,
  defaultWindowMs: 10_000,
  message: MESSAGE,
});

export function getPreferredPlateStatesRateLimitKey(
  req: Request,
  identity: RateLimitIdentity,
): string {
  if (identity && Number.isFinite(identity.userId)) {
    return `u:${identity.userId}`;
  }

  // `req.ip` is calculated by Express from the application's explicit
  // trusted-proxy policy. Never parse X-Forwarded-For here: a direct caller
  // controls that header and could otherwise mint a fresh bucket per request.
  const trustedRequestIp = req.ip || req.socket.remoteAddress || "unknown";
  return `ip:${trustedRequestIp}`;
}

function rejectRateLimited(res: Response, hit: RateLimitResult): false {
  res.setHeader(
    "Retry-After",
    Math.max(1, Math.ceil(hit.retryAfterMs / 1_000)),
  );
  res.status(429).json({
    message: MESSAGE,
    code: ERROR_CODE,
    retryAfterMs: hit.retryAfterMs,
    limit: hit.limit,
    windowMs: hit.windowMs,
  });
  return false;
}

export async function enforcePreferredPlateStatesRateLimit(
  req: Request,
  res: Response,
  identity: RateLimitIdentity,
): Promise<boolean> {
  const clientHit = await clientLimiter.recordHit(
    getPreferredPlateStatesRateLimitKey(req, identity),
    clientLimiter.getBudgetForRole(identity?.role),
  );
  if (!clientHit.ok) return rejectRateLimited(res, clientHit);

  // A fixed global bucket remains authoritative even when callers rotate IPs,
  // guest sessions, or staff identities. It caps the aggregate query cost for
  // this endpoint independently from the broader visit-read limiter.
  const globalHit = await globalLimiter.recordHit(
    "global",
    globalLimiter.getBudgetForRole(null),
  );
  if (!globalHit.ok) return rejectRateLimited(res, globalHit);

  return true;
}

export async function __resetPreferredPlateStatesRateLimitStateForTests(): Promise<void> {
  await Promise.all([
    clientLimiter.__resetStateForTests(),
    globalLimiter.__resetStateForTests(),
  ]);
}
