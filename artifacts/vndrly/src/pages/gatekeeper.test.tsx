import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({
  gateCheckIn: vi.fn(),
  gateCheckOut: vi.fn(),
  getSiteContext: vi.fn(),
  list: vi.fn(),
  listAssignedGateSites: vi.fn(),
  listPreferredPlateStates: vi.fn(),
  readPlate: vi.fn(),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({ user: { role: "vendor", vendorRole: "gatekeeper", vendorId: 1054 } }),
}));

vi.mock("@/hooks/use-brand", () => ({
  useBrand: () => ({ isOrgBranded: false, primary: "#f59e0b" }),
}));

vi.mock("@/hooks/use-gate-live-monitor", () => ({
  useGateLiveMonitor: () => ({ flash: null, liveStatus: "live" }),
}));

vi.mock("@/components/live-connection-pill", () => ({
  LiveConnectionPill: () => React.createElement("span", { "data-testid": "live-pill" }),
}));

vi.mock("@/lib/gatekeeper-log-export", () => ({
  exportExcel: vi.fn(),
  exportPdf: vi.fn(),
  exportWord: vi.fn(),
  latestVisitForPlate: () => null,
  normalizePlate: (value: string | null | undefined) => (value ?? "").toUpperCase().replace(/[^A-Z0-9]/g, ""),
  toGateLogRows: () => [],
}));

vi.mock("@/lib/visits-api", () => ({
  listAllVisits: vi.fn(async () => []),
  visitsApi: api,
}));

Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
  configurable: true,
  value: vi.fn(),
});
vi.stubGlobal(
  "ResizeObserver",
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
);

import GatekeeperPage from "./gatekeeper";

const ASSIGNED_SITE = {
  id: 42,
  name: "Acme HQ",
  address: "123 Main St",
  siteCode: "ACME-HQ",
  latitude: 37.7,
  longitude: -122.4,
  assignmentId: 9,
};

const SITE_CONTEXT = {
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

let geolocationMock: ReturnType<typeof vi.fn>;

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <GatekeeperPage />
    </QueryClientProvider>,
  );
}

async function selectState(name: string) {
  const user = userEvent.setup();
  const trigger = screen.getByRole("button", {
    name: /^(Select plate state|Selected plate state:)/,
  });
  await user.click(trigger);
  await user.click(screen.getByRole("option", { name }));
}

beforeEach(() => {
  vi.clearAllMocks();
  api.list.mockResolvedValue([]);
  api.listAssignedGateSites.mockResolvedValue({
    sites: [ASSIGNED_SITE],
    defaultSite: ASSIGNED_SITE,
  });
  api.getSiteContext.mockResolvedValue(SITE_CONTEXT);
  api.listPreferredPlateStates.mockResolvedValue({ preferred: ["CA", "TX", "NY", "FL", "OH"] });
  api.readPlate.mockResolvedValue({ plate: null, state: null, plateConfidence: null, stateConfidence: null });
  api.gateCheckIn.mockResolvedValue({ id: 88 });
  geolocationMock = vi.fn((success: (position: { coords: { latitude: number; longitude: number } }) => void) => {
    success({ coords: { latitude: 35.4, longitude: -97.5 } });
  });
  Object.defineProperty(navigator, "geolocation", {
    configurable: true,
    value: { getCurrentPosition: geolocationMock },
  });
});

describe("GatekeeperPage plate state", () => {
  it("waits for the authorized site id and renders its preferred states immediately before the plate input", async () => {
    let resolveSite!: (value: typeof SITE_CONTEXT) => void;
    api.getSiteContext.mockReturnValue(new Promise((resolve) => { resolveSite = resolve; }));
    api.listPreferredPlateStates.mockResolvedValue({ preferred: ["OK", "TX"] });

    renderPage();
    await waitFor(() => expect(api.getSiteContext).toHaveBeenCalledWith("ACME-HQ"));
    expect(api.listPreferredPlateStates).not.toHaveBeenCalled();

    resolveSite(SITE_CONTEXT);
    await waitFor(() => expect(api.listPreferredPlateStates).toHaveBeenCalledWith(42));
    const trigger = screen.getByRole("button", { name: "Select plate state" });
    const plateInput = screen.getByTestId("input-gate-plate");
    expect(trigger.compareDocumentPosition(plateInput) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    await userEvent.setup().click(trigger);
    expect(screen.getAllByRole("option").slice(0, 3).map((option) => option.textContent)).toEqual([
      "Oklahoma (OK)",
      "Texas (TX)",
      "Alabama (AL)",
    ]);
  });

  it("uses the national state fallback when site preferences fail", async () => {
    api.listPreferredPlateStates.mockRejectedValue(new Error("unavailable"));
    renderPage();

    await waitFor(() => expect(api.listPreferredPlateStates).toHaveBeenCalledWith(42));
    await userEvent.setup().click(screen.getByRole("button", { name: "Select plate state" }));
    expect(screen.getAllByRole("option").slice(0, 3).map((option) => option.textContent)).toEqual([
      "California (CA)",
      "Texas (TX)",
      "New York (NY)",
    ]);
  });

  it("blocks a missing state before geolocation or check-in and exposes an accessible error", async () => {
    renderPage();
    await screen.findByTestId("input-gate-plate");
    fireEvent.change(screen.getByTestId("input-gate-first-name"), { target: { value: "Jordan" } });
    fireEvent.change(screen.getByTestId("input-gate-last-name"), { target: { value: "Hale" } });
    fireEvent.change(screen.getByTestId("input-gate-plate"), { target: { value: "4412" } });
    await waitFor(() => {
      expect((screen.getByRole("button", { name: "gatekeeper.checkInVisitor" }) as HTMLButtonElement).disabled).toBe(false);
    });

    fireEvent.click(screen.getByRole("button", { name: "gatekeeper.checkInVisitor" }));

    expect(geolocationMock).not.toHaveBeenCalled();
    expect(api.gateCheckIn).not.toHaveBeenCalled();
    expect(screen.getByRole("alert").textContent).toBe("gatekeeper.plateStateRequired");
  });

  it("uses the OCR confidence threshold, preserves manual correction, sends state, and resets it", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("request-url")) {
        return { ok: true, json: async () => ({ uploadURL: "/upload", objectPath: "/objects/plate.jpg" }) };
      }
      if (url.includes("finalize") || init?.method === "PUT") return { ok: true };
      return { ok: true };
    });
    vi.stubGlobal("fetch", fetchMock);
    api.readPlate
      .mockResolvedValueOnce({ plate: "4412", state: "TX", plateConfidence: 0.97, stateConfidence: 0.79 })
      .mockResolvedValueOnce({ plate: "4412", state: "tx", plateConfidence: 0.97, stateConfidence: 0.8 });
    const { container } = renderPage();
    await screen.findByTestId("input-gate-plate");

    await selectState("Oklahoma (OK)");
    const plateInput = container.querySelector<HTMLInputElement>('input[type="file"][capture="environment"]')!;
    const file = new File(["plate"], "plate.jpg", { type: "image/jpeg" });
    fireEvent.change(plateInput, { target: { files: [file] } });
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Selected plate state: Oklahoma (OK)" })).toBeTruthy();
      expect((screen.getByTestId("input-gate-plate") as HTMLInputElement).value).toBe("4412");
    });

    fireEvent.change(plateInput, { target: { files: [file] } });
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Selected plate state: Texas (TX)" })).toBeTruthy();
    });
    await selectState("Oklahoma (OK)");
    fireEvent.change(screen.getByTestId("input-gate-first-name"), { target: { value: "Jordan" } });
    fireEvent.change(screen.getByTestId("input-gate-last-name"), { target: { value: "Hale" } });
    fireEvent.click(screen.getByRole("button", { name: "gatekeeper.checkInVisitor" }));

    await waitFor(() => expect(api.gateCheckIn).toHaveBeenCalledTimes(1));
    expect(api.gateCheckIn.mock.calls[0][0]).toMatchObject({
      plateState: "OK",
      vehiclePlate: "4412",
    });
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Select plate state" })).toBeTruthy();
    });
  });
});
