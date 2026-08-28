import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { PILL_ACTION } from "@/lib/pill-palette-assets";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({ user: { userId: 1, vendorId: 42 } }),
}));

vi.mock("@/hooks/use-brand", () => ({
  useBrand: () => ({ isOrgBranded: true, primary: "#159fb2" }),
}));

vi.mock("@/hooks/use-gate-live-monitor", () => ({
  useGateLiveMonitor: () => ({ flash: null, liveStatus: "live" }),
}));

vi.mock("@/lib/visits-api", () => ({
  listAllVisits: vi.fn(async () => []),
  visitsApi: {
    list: vi.fn(async () => []),
    listAssignedGateSites: vi.fn(async () => ({ sites: [], defaultSite: null })),
    getSiteContext: vi.fn(),
    readPlate: vi.fn(),
    gateCheckIn: vi.fn(),
    gateCheckOut: vi.fn(),
  },
}));

import GatekeeperPage from "./gatekeeper";

function renderPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(
    <QueryClientProvider client={client}>
      <GatekeeperPage />
    </QueryClientProvider>,
  );
}

function pillSrcs(el: HTMLElement): string[] {
  return Array.from(el.querySelectorAll("img")).map((img) => img.getAttribute("src") ?? "");
}

beforeEach(() => {
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: { getUserMedia: vi.fn() },
  });
});

afterEach(() => {
  cleanup();
});

describe("GatekeeperPage Gate log export pills", () => {
  it("uses the red palette pill for PDF and the green palette pill for Excel", async () => {
    renderPage();
    const pdf = await screen.findByTestId("button-gate-export-pdf");
    const excel = screen.getByTestId("button-gate-export-excel");
    const word = screen.getByTestId("button-gate-export-word");

    expect(pdf.textContent).toContain("PDF");
    expect(excel.textContent).toContain("Excel");
    expect(word.textContent).toContain("Word");

    expect(pillSrcs(pdf)).toContain(PILL_ACTION.red);
    expect(pillSrcs(pdf)).not.toContain(PILL_ACTION.blue);
    expect(pillSrcs(excel)).toContain(PILL_ACTION.green);
    expect(pillSrcs(excel)).not.toContain(PILL_ACTION.blue);
    expect(pillSrcs(word)).toContain(PILL_ACTION.blue);
  });
});
