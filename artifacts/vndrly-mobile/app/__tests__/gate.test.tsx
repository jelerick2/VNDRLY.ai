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

const {
  requestForegroundPermissionsAsyncMock,
  getCurrentPositionAsyncMock,
} = vi.hoisted(() => ({
  requestForegroundPermissionsAsyncMock: vi.fn(),
  getCurrentPositionAsyncMock: vi.fn(),
}));
vi.mock("expo-location", () => ({
  Accuracy: { High: 4, Balanced: 3 },
  requestForegroundPermissionsAsync: (...a: unknown[]) =>
    requestForegroundPermissionsAsyncMock(...a),
  getCurrentPositionAsync: (...a: unknown[]) => getCurrentPositionAsyncMock(...a),
}));

vi.mock("expo-secure-store", () => ({
  getItemAsync: vi.fn(async () => null),
  setItemAsync: vi.fn(async () => {}),
  deleteItemAsync: vi.fn(async () => {}),
}));

vi.mock("@/lib/api", () => ({ apiFetch: vi.fn(), initApi: vi.fn() }));
vi.mock("@/lib/auth", () => ({
  setToken: vi.fn(),
  setUser: vi.fn(),
  getToken: vi.fn(),
}));

const {
  fetchSiteContextMock,
  fetchGatekeeperVisitsMock,
  fetchGatekeeperRecentVisitsMock,
  fetchAssignedGateSitesMock,
  submitGatekeeperVisitMock,
  gatekeeperCheckOutMock,
  captureAndUploadImageMock,
  readGatePlateMock,
} = vi.hoisted(() => ({
  fetchSiteContextMock: vi.fn(),
  fetchGatekeeperVisitsMock: vi.fn(),
  fetchGatekeeperRecentVisitsMock: vi.fn(),
  fetchAssignedGateSitesMock: vi.fn(),
  submitGatekeeperVisitMock: vi.fn(),
  gatekeeperCheckOutMock: vi.fn(),
  captureAndUploadImageMock: vi.fn(),
  readGatePlateMock: vi.fn(),
}));

vi.mock("@/lib/guest", () => ({
  fetchSiteContext: (...a: unknown[]) => fetchSiteContextMock(...a),
}));

vi.mock("@/lib/gatekeeper", () => ({
  deleteGateEvidence: vi.fn(async () => undefined),
  fetchGatekeeperVisits: (...a: unknown[]) => fetchGatekeeperVisitsMock(...a),
  fetchGatekeeperRecentVisits: (...a: unknown[]) => fetchGatekeeperRecentVisitsMock(...a),
  fetchAssignedGateSites: (...a: unknown[]) => fetchAssignedGateSitesMock(...a),
  submitGatekeeperVisit: (...a: unknown[]) => submitGatekeeperVisitMock(...a),
  gatekeeperCheckOut: (...a: unknown[]) => gatekeeperCheckOutMock(...a),
  readGatePlate: (...a: unknown[]) => readGatePlateMock(...a),
}));

vi.mock("@/lib/photos", () => ({
  captureAndUploadImage: (...a: unknown[]) => captureAndUploadImageMock(...a),
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
    user: { role: "vendor", vendorRole: "gatekeeper", vendorId: 1054 },
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

vi.mock("@/components/AmberButton", async () => {
  const ReactLib = (await import("react")).default;
  return {
    default: ({
      children,
      onPress,
      disabled,
      loading,
      testID,
    }: {
      children: React.ReactNode;
      onPress?: () => void;
      disabled?: boolean;
      loading?: boolean;
      testID?: string;
    }) => {
      const isDisabled = !!(disabled || loading);
      return ReactLib.createElement(
        "button",
        {
          "data-testid": testID,
          "aria-disabled": isDisabled || undefined,
          disabled: isDisabled,
          onClick: isDisabled ? undefined : onPress,
        },
        typeof children === "string" ? children : "btn",
      );
    },
  };
});

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Alert } from "react-native";

import GatekeeperScreen from "../(tabs)/gate";
import type { SiteContext } from "@/lib/guest";

afterEach(() => {
  cleanup();
});

const FLYWHEEL_SITE = {
  id: 309,
  name: "Flywheel Energy Spur",
  address: "34.63951, -97.66194",
  siteCode: "SITE-B40D77D2",
  latitude: 34.63951,
  longitude: -97.66194,
  assignmentId: 14819,
};

beforeEach(() => {
  vi.clearAllMocks();
  fetchGatekeeperVisitsMock.mockResolvedValue([]);
  fetchGatekeeperRecentVisitsMock.mockResolvedValue([]);
  readGatePlateMock.mockResolvedValue(null);
  fetchAssignedGateSitesMock.mockResolvedValue({
    sites: [FLYWHEEL_SITE],
    defaultSite: FLYWHEEL_SITE,
  });
  vi.spyOn(Alert, "alert").mockImplementation(() => {});
});

const SITE_CTX: SiteContext = {
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

function renderScreen() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(
    <QueryClientProvider client={qc}>
      <GatekeeperScreen />
    </QueryClientProvider>,
  );
}

function firstByTestId(id: string): HTMLElement {
  return screen.getAllByTestId(id)[0];
}

async function findFirstByTestId(id: string): Promise<HTMLElement> {
  await screen.findByTestId(id);
  return firstByTestId(id);
}

function tap(el: HTMLElement): void {
  fireEvent.pointerDown(el);
  fireEvent.pointerUp(el);
  fireEvent.click(el);
}

function isDisabled(el: HTMLElement): boolean {
  if (el.getAttribute("aria-disabled") === "true") return true;
  if ((el as HTMLButtonElement).disabled === true) return true;
  return false;
}

describe("GatekeeperScreen", () => {
  it("shows the branded vendor logo in front of Gate Portal", async () => {
    renderScreen();
    await findFirstByTestId("gate-first-name");
    const logo = firstByTestId("gate-brand-logo");
    expect(logo.getAttribute("src")).toBe("https://cdn.example.com/vendor.png");
    expect(screen.getByText("gatekeeper.portal")).toBeTruthy();
  });

  it("does not show phone or email fields", async () => {
    renderScreen();
    await findFirstByTestId("gate-first-name");
    expect(screen.queryByText("visitor.phone")).toBeNull();
    expect(screen.queryByText("visitor.email")).toBeNull();
    expect(screen.queryByTestId("input-gate-phone")).toBeNull();
    expect(screen.queryByTestId("input-gate-email")).toBeNull();
  });

  it("shows tag and vehicle photo capture on the main form before site lookup", async () => {
    renderScreen();
    await findFirstByTestId("gate-first-name");
    expect(firstByTestId("gate-capture-tag-photo")).toBeTruthy();
    expect(firstByTestId("gate-capture-vehicle-photo")).toBeTruthy();
    expect(screen.queryByTestId("capture-plate-photo-btn")).toBeNull();
    expect(screen.queryByTestId("capture-vehicle-photo-btn")).toBeNull();
  });

  it("defaults the current location to Flywheel Energy Spur like the web booth", async () => {
    fetchSiteContextMock.mockResolvedValue({
      ...SITE_CTX,
      site: { ...SITE_CTX.site, name: "Flywheel Energy Spur", siteCode: "SITE-B40D77D2" },
    });
    renderScreen();
    expect(await screen.findByTestId("gate-site-option-SITE-B40D77D2")).toBeTruthy();
    expect(screen.getAllByText("Flywheel Energy Spur").length).toBeGreaterThan(0);
    expect((firstByTestId("gate-site-code") as HTMLInputElement).value).toBe(
      "SITE-B40D77D2",
    );
    await waitFor(() => {
      expect(fetchSiteContextMock).toHaveBeenCalledWith("SITE-B40D77D2");
    });
  });

  it("sends captured tag and vehicle photos with check-in and omits phone/email", async () => {
    fetchSiteContextMock.mockResolvedValue(SITE_CTX);
    captureAndUploadImageMock
      .mockResolvedValueOnce({ objectPath: "/uploads/tag.jpg" })
      .mockResolvedValueOnce({ objectPath: "/uploads/truck.jpg" });
    submitGatekeeperVisitMock.mockResolvedValue({ ok: true, visitId: 88 });

    renderScreen();
    await findFirstByTestId("gate-first-name");

    fireEvent.change(firstByTestId("gate-first-name"), { target: { value: "Jordan" } });
    fireEvent.change(firstByTestId("gate-last-name"), { target: { value: "Hale" } });

    tap(firstByTestId("gate-capture-tag-photo"));
    await waitFor(() => {
      expect(captureAndUploadImageMock).toHaveBeenCalledTimes(1);
      expect(isDisabled(firstByTestId("gate-capture-vehicle-photo"))).toBe(false);
    });
    tap(firstByTestId("gate-capture-vehicle-photo"));
    await waitFor(() => {
      expect(captureAndUploadImageMock).toHaveBeenCalledTimes(2);
      expect(isDisabled(firstByTestId("gate-capture-tag-photo"))).toBe(false);
    });

    fireEvent.change(firstByTestId("gate-site-code"), { target: { value: "ACME-HQ" } });
    tap(firstByTestId("gate-site-lookup"));
    tap(await findFirstByTestId("host-option-partner:7"));
    tap(firstByTestId("check-in-btn"));

    await waitFor(() => {
      expect(submitGatekeeperVisitMock).toHaveBeenCalledTimes(1);
    });
    const payload = submitGatekeeperVisitMock.mock.calls[0][0] as Record<string, unknown>;
    expect(payload).not.toHaveProperty("phone");
    expect(payload).not.toHaveProperty("email");
    expect(payload.platePhotoUrl).toBe("/uploads/tag.jpg");
    expect(payload.vehiclePhotoUrl).toBe("/uploads/truck.jpg");
    expect(payload.firstName).toBe("Jordan");
  });
});
