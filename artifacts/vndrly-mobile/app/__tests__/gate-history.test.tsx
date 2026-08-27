import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/useColors", () => ({
  useColors: () => ({
    background: "#fff",
    foreground: "#000",
    card: "#f5f5f5",
    border: "#ccc",
    primary: "#f59e0b",
    accent: "#fef3c7",
    mutedForeground: "#666",
    destructive: "#dc2626",
  }),
}));

vi.mock("@expo/vector-icons", () => ({ Feather: () => null }));

vi.mock("react-native-safe-area-context", async () => {
  const RN = await import("react-native");
  return {
    SafeAreaView: RN.View,
    SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  };
});

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock("@/hooks/use-brand", () => ({
  useBrand: () => ({
    isOrgBranded: true,
    logoSquareUrl: "https://cdn.example.com/vendor.png",
    logoUrl: null,
    name: "Acme Vendor",
    primary: "#f59e0b",
  }),
}));

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({
    user: { role: "vendor", vendorRole: "gatekeeper" },
    activeMembership: { orgLogoUrl: "https://cdn.example.com/vendor.png", orgName: "Acme Vendor" },
  }),
}));

vi.mock("@/components/AuthedImage", () => ({
  default: ({ uri, testID }: { uri?: string | null; testID?: string }) => {
    const ReactLib = require("react");
    return ReactLib.createElement("img", {
      "data-testid": testID ?? "authed-image",
      src: uri ?? "",
      alt: "",
    });
  },
}));

const { fetchGatekeeperHistoryMock } = vi.hoisted(() => ({
  fetchGatekeeperHistoryMock: vi.fn(),
}));

vi.mock("@/lib/gatekeeper", () => ({
  fetchGatekeeperHistory: (...a: unknown[]) => fetchGatekeeperHistoryMock(...a),
}));

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

import GateHistoryScreen from "../(tabs)/gate-history";

afterEach(() => {
  cleanup();
});

beforeEach(() => {
  vi.clearAllMocks();
});

const VISITS = [
  {
    id: 1,
    firstName: "Pat",
    lastName: "Reyes",
    company: "Acme Wireline",
    vehiclePlate: "ABC1234",
    plateState: "TX",
    siteName: "Energy Spur",
    purpose: "Service",
    hostPartnerName: null,
    hostVendorName: "MidCon",
    checkInTime: "2026-08-23T17:00:00.000Z",
    checkOutTime: "2026-08-23T18:00:00.000Z",
  },
  {
    id: 2,
    firstName: "Sam",
    lastName: "Ortiz",
    company: "Cactus",
    vehiclePlate: "TX-991",
    plateState: null,
    siteName: "Energy Spur",
    purpose: "Delivery",
    hostPartnerName: null,
    hostVendorName: "MidCon",
    checkInTime: "2026-08-22T08:00:00.000Z",
    checkOutTime: null,
  },
];

function renderScreen() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(
    <QueryClientProvider client={qc}>
      <GateHistoryScreen />
    </QueryClientProvider>,
  );
}

describe("GateHistoryScreen", () => {
  it("shows the vendor logo, 30-day visits, and filters by search", async () => {
    fetchGatekeeperHistoryMock.mockResolvedValue(VISITS);
    renderScreen();

    await waitFor(() => {
      expect(screen.getByTestId("gate-history-row-1")).toBeTruthy();
    });
    expect(screen.getByTestId("gate-history-brand-logo").getAttribute("src")).toBe(
      "https://cdn.example.com/vendor.png",
    );
    expect(screen.getByText("Pat Reyes")).toBeTruthy();
    expect(screen.getByText("Sam Ortiz")).toBeTruthy();
    expect(screen.getByText("gatekeeper.historyCheckedOut")).toBeTruthy();
    expect(screen.getByText("gatekeeper.historyOnSite")).toBeTruthy();
    expect(screen.getByTestId("gate-history-row-1").textContent).toContain("TX • ABC1234");
    expect(screen.getByTestId("gate-history-row-2").textContent).toContain("gatekeeper.plateStateUnconfirmed");

    fireEvent.change(screen.getByTestId("gate-history-search"), {
      target: { value: "cactus" },
    });
    expect(screen.queryByTestId("gate-history-row-1")).toBeNull();
    expect(screen.getByTestId("gate-history-row-2")).toBeTruthy();
  });

  it("shows an empty state when there are no visits", async () => {
    fetchGatekeeperHistoryMock.mockResolvedValue([]);
    renderScreen();
    expect(await screen.findByTestId("gate-history-empty")).toBeTruthy();
  });

  it("shows a no-match state when search misses", async () => {
    fetchGatekeeperHistoryMock.mockResolvedValue(VISITS);
    renderScreen();
    await waitFor(() => {
      expect(screen.getByTestId("gate-history-row-1")).toBeTruthy();
    });
    fireEvent.change(screen.getByTestId("gate-history-search"), {
      target: { value: "zzzz" },
    });
    expect(screen.getByTestId("gate-history-no-match")).toBeTruthy();
  });

  it("shows an error when history fails to load", async () => {
    fetchGatekeeperHistoryMock.mockRejectedValue(new Error("nope"));
    renderScreen();
    expect(await screen.findByTestId("gate-history-error")).toBeTruthy();
  });
});
