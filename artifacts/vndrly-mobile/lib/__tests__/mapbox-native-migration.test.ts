import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(__dirname, "../..");

describe("mobile Mapbox native migration", () => {
  const primaryMapFiles = [
    "components/ForemanCrewMapScreen.tsx",
    "components/PartnerSiteCrewMapScreen.tsx",
    "components/TicketRouteMap.tsx",
    "app/crew-replay/[employeeId].tsx",
  ];

  it.each(primaryMapFiles)("%s renders through @rnmapbox/maps instead of Leaflet WebView", (file) => {
    const source = readFileSync(resolve(repoRoot, file), "utf8");
    expect(source).toContain("MapboxNativeMap");
    expect(source).not.toContain("react-native-webview");
    expect(source).not.toContain("buildCrewMapHtml");
    expect(source).not.toContain("leaflet");
    expect(source).not.toContain("L.");
  });

  it("keeps the shared native map on the Mapbox SDK", () => {
    const source = readFileSync(resolve(repoRoot, "components/MapboxNativeMap.tsx"), "utf8");
    expect(source).toContain("@rnmapbox/maps");
  });
});
