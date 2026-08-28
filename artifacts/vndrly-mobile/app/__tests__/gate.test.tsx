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
    t: (key: string, options?: Record<string, unknown>) => {
      const strings: Record<string, string> = {
        "plateStatePicker.label": "Plate state",
        "plateStatePicker.select": "Select plate state",
        "plateStatePicker.selected": "Selected plate state: {{state}} ({{code}})",
        "plateStatePicker.search": "Search states",
        "plateStatePicker.noResults": "No states found.",
        "plateStatePicker.preferred": "Preferred states",
        "plateStatePicker.all": "All states",
        "plateStatePicker.close": "Close",
        "plateStatePicker.closePicker": "Close plate state picker",
        "plateStatePicker.openHint": "Opens the plate state picker.",
        "plateStatePicker.options": "Plate state options",
        "plateStatePicker.option": "{{state}} ({{code}}), state option",
        "plateStatePicker.errorHint": "Error: {{error}}",
        "gatekeeper.plateStateSuggested": "Suggested state: {{state}}",
        "gatekeeper.plateStateCorrected": "State corrected: {{state}}",
      };
      const template = strings[key] ?? key;
      return template.replace(/\{\{(\w+)\}\}/g, (_, name) =>
        String(options?.[name] ?? ""),
      );
    },
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
  fetchPreferredPlateStatesMock,
  submitGatekeeperVisitMock,
  gatekeeperCheckOutMock,
  captureAndUploadImageMock,
  readGatePlateMock,
} = vi.hoisted(() => ({
  fetchSiteContextMock: vi.fn(),
  fetchGatekeeperVisitsMock: vi.fn(),
  fetchGatekeeperRecentVisitsMock: vi.fn(),
  fetchAssignedGateSitesMock: vi.fn(),
  fetchPreferredPlateStatesMock: vi.fn(),
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
  fetchPreferredPlateStates: (...a: unknown[]) => fetchPreferredPlateStatesMock(...a),
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
  fetchPreferredPlateStatesMock.mockResolvedValue({ preferred: ["CA", "TX", "NY", "FL", "OH"] });
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
  it("renders the state-qualified plate in the active visit rows", async () => {
    fetchGatekeeperVisitsMock.mockResolvedValue([
      {
        id: 88,
        firstName: "Taylor",
        lastName: "Reed",
        company: "Acme",
        siteLocationId: 42,
        siteName: "Acme HQ",
        siteAddress: "123 Main St",
        hostType: "partner",
        hostPartnerName: "Acme Partner",
        hostVendorName: null,
        purpose: "Delivery",
        vehiclePlate: "ABC123",
        plateState: "TX",
        platePhotoUrl: null,
        vehiclePhotoUrl: null,
        expectedDurationMinutes: 60,
        checkInTime: "2026-08-27T12:00:00Z",
        checkOutTime: null,
        expiresAt: "2026-08-27T13:00:00Z",
      },
    ]);

    const view = renderScreen();

    await waitFor(() => expect(view.container.textContent).toContain("TX • ABC123"));
  });

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

  it("renders site-preferred plate states immediately before the plate input", async () => {
    fetchSiteContextMock.mockResolvedValue(SITE_CTX);
    fetchPreferredPlateStatesMock.mockResolvedValue({ preferred: ["OK", "TX"] });

    renderScreen();

    await waitFor(() => {
      expect(fetchPreferredPlateStatesMock).toHaveBeenCalledWith(42);
    });
    const trigger = screen.getByRole("button", { name: "Select plate state" });
    const plateInput = firstByTestId("gate-vehicle-plate");
    expect(trigger.compareDocumentPosition(plateInput) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    tap(trigger);
    const stateOptions = screen.getAllByRole("button", { name: /state option$/ });
    expect(stateOptions.slice(0, 3).map((option) => option.getAttribute("aria-label"))).toEqual([
      "Oklahoma (OK), state option",
      "Texas (TX), state option",
      "Alabama (AL), state option",
    ]);
  });

  it("uses the national state fallback when site preferences fail", async () => {
    fetchSiteContextMock.mockResolvedValue(SITE_CTX);
    fetchPreferredPlateStatesMock.mockRejectedValue(new Error("unavailable"));
    renderScreen();

    await waitFor(() => expect(fetchPreferredPlateStatesMock).toHaveBeenCalledWith(42));
    tap(screen.getByRole("button", { name: "Select plate state" }));
    const stateOptions = screen.getAllByRole("button", { name: /state option$/ });
    expect(stateOptions.slice(0, 3).map((option) => option.getAttribute("aria-label"))).toEqual([
      "California (CA), state option",
      "Texas (TX), state option",
      "New York (NY), state option",
    ]);
  });

  it("waits for state before filling a returning driver and then chooses the exact composite match", async () => {
    fetchSiteContextMock.mockResolvedValue(SITE_CTX);
    fetchGatekeeperRecentVisitsMock.mockResolvedValue([
      {
        id: 2,
        firstName: "Wrong",
        lastName: "State",
        company: "Peak Energy",
        vehiclePlate: "4412",
        plateState: "OK",
        purpose: "Wrong match",
        expectedDurationMinutes: 60,
        checkInTime: "2026-08-23T10:00:00Z",
      },
      {
        id: 1,
        firstName: "Exact",
        lastName: "Texas",
        company: "Peak Energy",
        vehiclePlate: "44-12",
        plateState: "TX",
        purpose: "Exact match",
        expectedDurationMinutes: 45,
        checkInTime: "2026-08-20T10:00:00Z",
      },
    ]);
    renderScreen();

    fireEvent.change(await findFirstByTestId("gate-vehicle-plate"), { target: { value: "4412" } });
    tap(screen.getByRole("button", { name: "Select plate state" }));
    tap(screen.getByRole("button", { name: "Texas (TX), state option" }));

    await waitFor(() => {
      expect((firstByTestId("gate-first-name") as HTMLInputElement).value).toBe("Exact");
      expect((firstByTestId("gate-last-name") as HTMLInputElement).value).toBe("Texas");
    });
  });

  it("replaces prior composite auto-fill after switching to a state with a different exact match and preserves manual edits", async () => {
    fetchSiteContextMock.mockResolvedValue(SITE_CTX);
    fetchGatekeeperRecentVisitsMock.mockResolvedValue([
      {
        id: 1,
        firstName: "Oklahoma",
        lastName: "Visitor",
        company: "Sooner Services",
        vehiclePlate: "4412",
        plateState: "OK",
        purpose: "Delivery",
        expectedDurationMinutes: 30,
        checkInTime: "2026-08-23T10:00:00Z",
      },
      {
        id: 2,
        firstName: "Texas",
        lastName: "Driver",
        company: "Lone Star Services",
        vehiclePlate: "4412",
        plateState: "TX",
        purpose: "Inspection",
        expectedDurationMinutes: 45,
        checkInTime: "2026-08-22T10:00:00Z",
      },
    ]);
    renderScreen();

    fireEvent.change(await findFirstByTestId("gate-vehicle-plate"), { target: { value: "4412" } });
    tap(screen.getByRole("button", { name: "Select plate state" }));
    tap(screen.getByRole("button", { name: "Oklahoma (OK), state option" }));
    await waitFor(() => {
      expect((firstByTestId("gate-first-name") as HTMLInputElement).value).toBe("Oklahoma");
      expect((firstByTestId("gate-last-name") as HTMLInputElement).value).toBe("Visitor");
    });

    fireEvent.change(firstByTestId("gate-first-name"), { target: { value: "Manual" } });
    tap(screen.getByRole("button", { name: "Selected plate state: Oklahoma (OK)" }));
    tap(screen.getByRole("button", { name: "Texas (TX), state option" }));

    await waitFor(() => {
      expect((firstByTestId("gate-first-name") as HTMLInputElement).value).toBe("Manual");
      expect((firstByTestId("gate-last-name") as HTMLInputElement).value).toBe("Driver");
    });
  });

  it("clears prior composite auto-fill when OCR corrects the state to one with no match and preserves manual edits", async () => {
    fetchSiteContextMock.mockResolvedValue(SITE_CTX);
    fetchGatekeeperRecentVisitsMock.mockResolvedValue([
      {
        id: 1,
        firstName: "Oklahoma",
        lastName: "Visitor",
        company: "Sooner Services",
        vehiclePlate: "4412",
        plateState: "OK",
        purpose: "Delivery",
        expectedDurationMinutes: 30,
        checkInTime: "2026-08-23T10:00:00Z",
      },
    ]);
    captureAndUploadImageMock.mockResolvedValue({ objectPath: "/uploads/tx.jpg" });
    readGatePlateMock.mockResolvedValue({
      plate: "4412",
      state: "TX",
      plateConfidence: 0.98,
      stateConfidence: 0.91,
    });
    renderScreen();

    fireEvent.change(await findFirstByTestId("gate-vehicle-plate"), { target: { value: "4412" } });
    tap(screen.getByRole("button", { name: "Select plate state" }));
    tap(screen.getByRole("button", { name: "Oklahoma (OK), state option" }));
    await waitFor(() => {
      expect((firstByTestId("gate-last-name") as HTMLInputElement).value).toBe("Visitor");
    });

    fireEvent.change(firstByTestId("gate-first-name"), { target: { value: "Manual" } });
    tap(firstByTestId("gate-capture-tag-photo"));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Selected plate state: Texas (TX)" })).toBeTruthy();
      expect((firstByTestId("gate-first-name") as HTMLInputElement).value).toBe("Manual");
      expect((firstByTestId("gate-last-name") as HTMLInputElement).value).toBe("");
    });
  });

  it("blocks a missing plate state before starting check-in work and exposes an accessible error", async () => {
    fetchSiteContextMock.mockResolvedValue(SITE_CTX);
    submitGatekeeperVisitMock.mockResolvedValue({ ok: true, visitId: 88 });
    renderScreen();

    fireEvent.change(await findFirstByTestId("gate-first-name"), { target: { value: "Jordan" } });
    fireEvent.change(firstByTestId("gate-last-name"), { target: { value: "Hale" } });
    fireEvent.change(firstByTestId("gate-vehicle-plate"), { target: { value: "4412" } });
    fireEvent.change(firstByTestId("gate-site-code"), { target: { value: "ACME-HQ" } });
    tap(firstByTestId("gate-site-lookup"));
    tap(await findFirstByTestId("host-option-partner:7"));
    tap(firstByTestId("check-in-btn"));

    expect(submitGatekeeperVisitMock).not.toHaveBeenCalled();
    expect(screen.getByRole("alert").textContent).toBe("gatekeeper.plateStateRequired");
  });

  it("applies the OCR threshold, keeps manual correction, sends state, and clears it after success", async () => {
    fetchSiteContextMock.mockResolvedValue(SITE_CTX);
    captureAndUploadImageMock
      .mockResolvedValueOnce({ objectPath: "/uploads/low.jpg" })
      .mockResolvedValueOnce({ objectPath: "/uploads/high.jpg" });
    readGatePlateMock
      .mockResolvedValueOnce({ plate: "4412", state: "TX", plateConfidence: 0.97, stateConfidence: 0.79 })
      .mockResolvedValueOnce({ plate: "4412", state: "TX", plateConfidence: 0.97, stateConfidence: 0.8 });
    submitGatekeeperVisitMock.mockResolvedValue({ ok: true, visitId: 88 });
    renderScreen();

    tap(await screen.findByRole("button", { name: "Select plate state" }));
    tap(screen.getByRole("button", { name: "Oklahoma (OK), state option" }));
    tap(firstByTestId("gate-capture-tag-photo"));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Selected plate state: Oklahoma (OK)" })).toBeTruthy();
      expect((firstByTestId("gate-vehicle-plate") as HTMLInputElement).value).toBe("4412");
    });

    tap(firstByTestId("gate-capture-tag-photo"));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Selected plate state: Texas (TX)" })).toBeTruthy();
      expect(screen.getByText("Suggested state: TX")).toBeTruthy();
    });
    tap(screen.getByRole("button", { name: "Selected plate state: Texas (TX)" }));
    tap(screen.getByRole("button", { name: "Oklahoma (OK), state option" }));
    expect(screen.getByText("State corrected: OK")).toBeTruthy();

    fireEvent.change(firstByTestId("gate-first-name"), { target: { value: "Jordan" } });
    fireEvent.change(firstByTestId("gate-last-name"), { target: { value: "Hale" } });
    fireEvent.change(firstByTestId("gate-site-code"), { target: { value: "ACME-HQ" } });
    tap(firstByTestId("gate-site-lookup"));
    tap(await findFirstByTestId("host-option-partner:7"));
    tap(firstByTestId("check-in-btn"));

    await waitFor(() => expect(submitGatekeeperVisitMock).toHaveBeenCalledTimes(1));
    expect(submitGatekeeperVisitMock.mock.calls[0][0]).toMatchObject({
      plateState: "OK",
      vehiclePlate: "4412",
    });
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Select plate state" })).toBeTruthy();
      expect(screen.queryByText("State corrected: OK")).toBeNull();
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
    tap(screen.getByRole("button", { name: "Select plate state" }));
    tap(screen.getByRole("button", { name: "Oklahoma (OK), state option" }));

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
