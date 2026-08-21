import { describe, expect, it } from "vitest";
import {
  clampActionAuditLimit,
  normalizeActionAuditStatus,
  toActionAuditListRow,
} from "./action-audit-query";

describe("AskV action audit query helpers", () => {
  it("clamps list limits into the supported admin range", () => {
    expect(clampActionAuditLimit(undefined)).toBe(50);
    expect(clampActionAuditLimit("not-a-number")).toBe(50);
    expect(clampActionAuditLimit("0")).toBe(50);
    expect(clampActionAuditLimit("4.8")).toBe(4);
    expect(clampActionAuditLimit("250")).toBe(100);
  });

  it("allows only known result-status filters", () => {
    expect(normalizeActionAuditStatus("success")).toBe("success");
    expect(normalizeActionAuditStatus("requires_confirmation")).toBe(
      "requires_confirmation",
    );
    expect(normalizeActionAuditStatus("failed")).toBe("failed");
    expect(normalizeActionAuditStatus("cancelled")).toBe("cancelled");
    expect(normalizeActionAuditStatus("all")).toBeNull();
    expect(normalizeActionAuditStatus("")).toBeNull();
    expect(normalizeActionAuditStatus("pending")).toBeNull();
  });

  it("maps DB rows to privacy-safe admin list rows", () => {
    const row = toActionAuditListRow({
      id: 42,
      createdAt: new Date("2026-08-21T12:34:56.000Z"),
      userId: 7,
      userDisplayName: "Ada Lovelace",
      userEmail: "ada@example.com",
      actorRole: "admin",
      actorMembershipRole: "admin",
      partnerId: null,
      vendorId: 3,
      vendorPeopleId: null,
      clientSurface: "web",
      inputMode: "voice",
      provider: "openai_realtime",
      toolName: "mark_notifications_read",
      actionType: "write",
      targetType: "notification",
      targetId: "abc",
      confirmationPhrase: "mark those read",
      gpsLatitude: 32.1,
      gpsLongitude: -101.2,
      gpsAccuracyMeters: 12,
      resultStatus: "success",
      errorCode: null,
      errorMessage: null,
      toolInput: { ids: ["abc"] },
      toolOutput: { count: 1 },
    });

    expect(row).toEqual({
      id: 42,
      createdAt: "2026-08-21T12:34:56.000Z",
      userId: 7,
      userDisplayName: "Ada Lovelace",
      userEmail: "ada@example.com",
      actorRole: "admin",
      actorMembershipRole: "admin",
      partnerId: null,
      vendorId: 3,
      vendorPeopleId: null,
      clientSurface: "web",
      inputMode: "voice",
      provider: "openai_realtime",
      toolName: "mark_notifications_read",
      actionType: "write",
      targetType: "notification",
      targetId: "abc",
      confirmationPhrase: "mark those read",
      resultStatus: "success",
      errorCode: null,
      errorMessage: null,
      hasGps: true,
      hasToolInput: true,
      hasToolOutput: true,
    });
    expect(row).not.toHaveProperty("gpsLatitude");
    expect(row).not.toHaveProperty("toolInput");
    expect(row).not.toHaveProperty("toolOutput");
  });
});
