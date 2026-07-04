import { describe, expect, it } from "vitest";

import { estimateMapboxDrivingRoute } from "./mapbox-routing";

describe("estimateMapboxDrivingRoute", () => {
  it("normalizes Mapbox driving route distance and duration", async () => {
    const fetchImpl = async (url: string) => {
      expect(url).toContain("api.mapbox.com/directions/v5/mapbox/driving-traffic");
      expect(url).toContain("-101.944");
      expect(url).toContain("31.997");
      return {
        ok: true,
        status: 200,
        json: async () => ({
          routes: [{ distance: 32186.9, duration: 2420.2 }],
          code: "Ok",
        }),
      } as Response;
    };

    const result = await estimateMapboxDrivingRoute(
      {
        origin: { latitude: 31.997, longitude: -102.077 },
        destination: { latitude: 31.834, longitude: -101.944 },
      },
      { accessToken: "pk.test", fetchImpl },
    );

    expect(result).toEqual({
      ok: true,
      provider: "mapbox",
      trafficAware: true,
      distanceMiles: 20,
      durationMinutes: 40,
      routeConfidence: "high",
    });
  });

  it("returns a configuration error when no token is available", async () => {
    const result = await estimateMapboxDrivingRoute(
      {
        origin: { latitude: 31.997, longitude: -102.077 },
        destination: { latitude: 31.834, longitude: -101.944 },
      },
      { accessToken: "" },
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errorCode).toBe("mapbox.missing_token");
    }
  });
});
