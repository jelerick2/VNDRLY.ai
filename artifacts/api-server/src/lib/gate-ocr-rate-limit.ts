import { createRateLimiter } from "./rate-limit-factory";

const limiter = createRateLimiter({
  resourcePrefix: "GATE_OCR",
  errorCode: "visits.plate_ocr_rate_limited",
  logKind: "visits.plate_ocr.rate_limit.trip",
  defaultMax: 12,
  defaultWindowMs: 60 * 1000,
  message: "Too many plate-reading requests. Please type the plate or try again shortly.",
});

export const enforceGateOcrRateLimit = limiter.enforce;
export const __resetGateOcrRateLimitStateForTests = limiter.__resetStateForTests;
