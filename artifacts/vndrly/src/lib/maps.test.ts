import { describe, expect, it, vi } from "vitest";

import {
  getLeafletTileLayerConfig,
  getMapboxStaticTile,
  getMapboxStyleTileUrl,
} from "./maps";

describe("Mapbox map provider helpers", () => {
  it("builds Mapbox style tile URLs with the configured access token", () => {
    vi.stubEnv("VITE_MAPBOX_ACCESS_TOKEN", "pk.test-token");
    expect(getMapboxStyleTileUrl("satellite")).toContain(
      "api.mapbox.com/styles/v1/mapbox/satellite-streets-v12/tiles/256/{z}/{x}/{y}@2x",
    );
    expect(getMapboxStyleTileUrl("satellite")).toContain("access_token=pk.test-token");
  });

  it("uses Mapbox for Leaflet tile config when a token exists", () => {
    vi.stubEnv("VITE_MAPBOX_ACCESS_TOKEN", "pk.test-token");
    const cfg = getLeafletTileLayerConfig("street");
    expect(cfg.provider).toBe("mapbox");
    expect(cfg.url).toContain("mapbox/streets-v12");
  });

  it("builds static Mapbox tile URLs for thumbnails", () => {
    vi.stubEnv("VITE_MAPBOX_ACCESS_TOKEN", "pk.test-token");
    const tile = getMapboxStaticTile(31.997, -102.078, 15);
    expect(tile.url).toContain("api.mapbox.com/styles/v1/mapbox/satellite-streets-v12/tiles/256/15/");
    expect(tile.url).toContain("access_token=pk.test-token");
  });
});
