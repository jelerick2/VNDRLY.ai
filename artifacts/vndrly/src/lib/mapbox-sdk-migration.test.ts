import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(__dirname, "../..");

describe("web Mapbox SDK migration", () => {
  const primaryMapFiles = [
    "src/components/site-location-map.tsx",
    "src/components/ticket-route-map.tsx",
    "src/pages/crew-map.tsx",
    "src/pages/site-map.tsx",
    "src/pages/visit-detail.tsx",
  ];

  it.each(primaryMapFiles)("%s renders through Mapbox GL instead of Leaflet", (file) => {
    const source = readFileSync(resolve(repoRoot, file), "utf8");
    expect(source).toContain("MapboxMap");
    expect(source).not.toContain("react-leaflet");
    expect(source).not.toContain("leaflet");
    expect(source).not.toContain("<TileLayer");
    expect(source).not.toContain("<MapContainer");
  });

  it("keeps the shared web map on the Mapbox GL SDK", () => {
    const source = readFileSync(resolve(repoRoot, "src/components/mapbox-map.tsx"), "utf8");
    expect(source).toContain("mapbox-gl");
  });
});
