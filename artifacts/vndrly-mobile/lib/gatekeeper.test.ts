import { beforeEach, describe, expect, it, vi } from "vitest";

import type { SiteContext } from "./guest";

const apiFetchMock = vi.fn();
const requestForegroundPermissionsAsyncMock = vi.fn();
const getCurrentPositionAsyncMock = vi.fn();

vi.mock("./api", () => ({
  apiFetch: (...args: unknown[]) => apiFetchMock(...args),
}));

vi.mock("expo-location", () => ({
  Accuracy: { High: 4, Balanced: 3 },
  requestForegroundPermissionsAsync: (...args: unknown[]) =>
    requestForegroundPermissionsAsyncMock(...args),
  getCurrentPositionAsync: (...args: unknown[]) =>
    getCurrentPositionAsyncMock(...args),
}));

vi.mock("expo-camera", () => ({
  CameraView: () => null,
  useCameraPermissions: () => [{ granted: false }, vi.fn()],
}));

vi.mock("./auth", () => ({
  setToken: vi.fn(),
  setUser: vi.fn(),
  getToken: vi.fn(),
}));

const baseCtx: SiteContext = {
  site: {
    id: 42,
    name: "Acme HQ",
    address: "123 Main St",
    latitude: 37.7,
    longitude: -122.4,
    siteRadiusMeters: 100,
    siteCode: "ACME-HQ",
  },
  partner: { id: 7, name: "Acme Partner" },
  vendors: [{ id: 11, name: "Bolt Vendor" }],
};

beforeEach(() => {
  vi.clearAllMocks();
  apiFetchMock.mockReset();
  requestForegroundPermissionsAsyncMock.mockResolvedValue({ status: "granted" });
  getCurrentPositionAsyncMock.mockResolvedValue({
    coords: { latitude: 1.23, longitude: 4.56 },
  });
  apiFetchMock.mockResolvedValue({ id: 88 });
});

describe("fetchGatekeeperHistory", () => {
  it("lists visits from the last 30 days including checked-out rows", async () => {
    const { fetchGatekeeperHistory } = await import("./gatekeeper");
    apiFetchMock.mockResolvedValueOnce([
      { id: 1, checkOutTime: "2026-08-23T18:00:00.000Z" },
      { id: 2, checkOutTime: null },
    ]).mockResolvedValueOnce([]);

    const from = "2026-07-24T17:00:00.000Z";
    const rows = await fetchGatekeeperHistory(from);

    expect(apiFetchMock).toHaveBeenCalledWith(
      `/api/visits?from=${encodeURIComponent(from)}&limit=1000&offset=0`,
    );
    expect(rows).toHaveLength(2);
  });
});

describe("submitGatekeeperVisit", () => {
  it("requires a license plate before requesting location", async () => {
    const { submitGatekeeperVisit } = await import("./gatekeeper");
    const result = await submitGatekeeperVisit({
      ctx: baseCtx,
      hostKey: "partner:7",
      firstName: "Jordan",
      lastName: "Hale",
      company: "Peak Energy",
      vehiclePlate: "",
      purpose: "Water haul",
      durationStr: "45",
    });
    expect(result).toEqual({ ok: false, reason: "missing-plate" });
    expect(requestForegroundPermissionsAsyncMock).not.toHaveBeenCalled();
  });

  it("posts tag and vehicle photo URLs and omits phone and email", async () => {
    const { submitGatekeeperVisit } = await import("./gatekeeper");

    const result = await submitGatekeeperVisit({
      ctx: baseCtx,
      hostKey: "partner:7",
      firstName: "Jordan",
      lastName: "Hale",
      company: "Peak Energy",
      vehiclePlate: "OK-4412",
      purpose: "Water haul",
      durationStr: "45",
      platePhotoUrl: "/uploads/tag.jpg",
      vehiclePhotoUrl: "/uploads/truck.jpg",
    });

    expect(result).toEqual({ ok: true, visitId: 88 });
    expect(apiFetchMock).toHaveBeenCalledTimes(1);
    const [, options] = apiFetchMock.mock.calls[0] as [string, { body: string }];
    const body = JSON.parse(options.body) as Record<string, unknown>;
    expect(body).not.toHaveProperty("phone");
    expect(body).not.toHaveProperty("email");
    expect(body.platePhotoUrl).toBe("/uploads/tag.jpg");
    expect(body.vehiclePhotoUrl).toBe("/uploads/truck.jpg");
    expect(body.firstName).toBe("Jordan");
    expect(body.vehiclePlate).toBe("OK-4412");
  });
});
