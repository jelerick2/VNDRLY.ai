import { describe, expect, it, vi } from "vitest";

import {
  getMapboxStaticTile,
  getMapboxStyleTileUrl,
  readMapboxAccessToken,
} from "../maps";

describe("mobile Mapbox provider helpers", () => {
  it("builds Mapbox style tile URLs from the Expo public token", () => {
    vi.stubEnv("EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN", "pk.mobile-token");
    expect(getMapboxStyleTileUrl("satellite")).toContain(
      "api.mapbox.com/styles/v1/mapbox/satellite-streets-v12/tiles/256/{z}/{x}/{y}@2x",
    );
    expect(getMapboxStyleTileUrl("satellite")).toContain("access_token=pk.mobile-token");
  });

  it("reads the native SDK access token when configured", () => {
    vi.stubEnv("EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN", "pk.mobile-token");
    expect(readMapboxAccessToken()).toBe("pk.mobile-token");
  });

  it("uses Mapbox for static tile thumbnails", () => {
    vi.stubEnv("EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN", "pk.mobile-token");
    expect(getMapboxStaticTile(31.997, -102.078, 15).url).toContain(
      "access_token=pk.mobile-token",
    );
  });
});
