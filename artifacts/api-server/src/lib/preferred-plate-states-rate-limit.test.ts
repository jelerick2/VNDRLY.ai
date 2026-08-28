import type { Request } from "express";
import { describe, expect, it } from "vitest";

import { getPreferredPlateStatesRateLimitKey } from "./preferred-plate-states-rate-limit";
import {
  GUEST_ALLOWLIST,
  PUBLIC_UNAUTHENTICATED_ALLOWLIST,
} from "./publicApiAllowlist";

describe("preferred plate-state limiter identity", () => {
  it("uses Express trusted-proxy IP semantics instead of caller-controlled forwarding headers", () => {
    const request = {
      ip: "203.0.113.7",
      headers: { "x-forwarded-for": "198.51.100.99" },
      socket: { remoteAddress: "127.0.0.1" },
    } as unknown as Request;

    expect(getPreferredPlateStatesRateLimitKey(request, null)).toBe(
      "ip:203.0.113.7",
    );
  });

  it("uses authenticated identity ahead of IP", () => {
    const request = {
      ip: "203.0.113.7",
      headers: {},
      socket: { remoteAddress: "127.0.0.1" },
    } as unknown as Request;

    expect(
      getPreferredPlateStatesRateLimitKey(request, {
        userId: -42,
        role: "guest",
      }),
    ).toBe("u:-42");
  });
});

describe("preferred plate-state public routing", () => {
  it("lets public and guest requests reach the route's QR-proof authorization", () => {
    const path = "/api/visits/sites/42/preferred-plate-states";
    for (const allowlist of [
      GUEST_ALLOWLIST,
      PUBLIC_UNAUTHENTICATED_ALLOWLIST,
    ]) {
      expect(
        allowlist.some(
          (rule) => rule.method === "GET" && rule.pattern.test(path),
        ),
      ).toBe(true);
    }
  });
});
