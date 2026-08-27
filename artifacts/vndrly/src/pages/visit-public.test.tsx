import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({
  checkIn: vi.fn(),
  checkOut: vi.fn(),
  getSiteContext: vi.fn(),
  guestLogout: vi.fn(),
  guestMe: vi.fn(),
  listPreferredPlateStates: vi.fn(),
  myActive: vi.fn(),
  startGuestSession: vi.fn(),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("@/lib/visits-api", () => ({ visitsApi: api }));

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

import VisitPublicPage from "./visit-public";

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
  partner: {
    id: 7,
    name: "Acme Partner",
    logoUrl: null,
    logoSquareUrl: null,
    brandPrimaryColor: null,
    brandAccentColor: null,
  },
  vendors: [{ id: 11, name: "Bolt Vendor" }],
};

const EMPTY_SESSION = {
  guestSessionId: 1,
  role: "guest",
  expiresAt: "2026-08-28T12:00:00.000Z",
  profile: {
    firstName: "",
    lastName: "",
    phone: null,
    email: null,
    company: null,
    vehiclePlate: null,
    plateState: null,
    lastPurpose: null,
  },
};

let geolocationMock: ReturnType<typeof vi.fn>;

function renderPage(client?: QueryClient) {
  const queryClient = client ?? new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return {
    client: queryClient,
    ...render(
    <QueryClientProvider client={queryClient}>
      <VisitPublicPage siteCode="ACME-HQ" />
    </QueryClientProvider>,
    ),
  };
}

async function selectState(name: string) {
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: /^(Select plate state|Selected plate state:)/ }));
  await user.click(screen.getByRole("option", { name }));
}

function fillRequiredIdentity() {
  fireEvent.change(screen.getByTestId("input-first-name"), { target: { value: "Jane" } });
  fireEvent.change(screen.getByTestId("input-last-name"), { target: { value: "Doe" } });
  fireEvent.change(screen.getByTestId("input-phone"), { target: { value: "5551234567" } });
  fireEvent.change(screen.getByTestId("input-email"), { target: { value: "jane@example.com" } });
  fireEvent.change(screen.getByTestId("input-company"), { target: { value: "Acme" } });
  fireEvent.change(screen.getByTestId("input-purpose"), { target: { value: "Inspection" } });
  fireEvent.click(screen.getByTestId("safety-row"));
}

beforeEach(() => {
  vi.clearAllMocks();
  api.getSiteContext.mockResolvedValue(SITE_CONTEXT);
  api.listPreferredPlateStates.mockResolvedValue({ preferred: ["CA", "TX", "NY", "FL", "OH"] });
  api.myActive.mockResolvedValue(null);
  api.guestMe.mockResolvedValue(EMPTY_SESSION);
  api.startGuestSession.mockResolvedValue(EMPTY_SESSION);
  api.checkIn.mockResolvedValue({
    id: 99,
    siteLocationId: 42,
    siteName: "Acme HQ",
    hostType: "partner",
    hostPartnerName: "Acme Partner",
    hostVendorName: null,
    purpose: "Inspection",
    vehiclePlate: "ABC123",
    plateState: "TX",
    checkInTime: "2026-08-27T12:00:00.000Z",
  });
  api.checkOut.mockResolvedValue({ id: 99 });
  api.guestLogout.mockResolvedValue(undefined);
  geolocationMock = vi.fn((success: (position: { coords: { latitude: number; longitude: number } }) => void) => {
    success({ coords: { latitude: 35.4, longitude: -97.5 } });
  });
  Object.defineProperty(navigator, "geolocation", {
    configurable: true,
    value: { getCurrentPosition: geolocationMock },
  });
});

describe("VisitPublicPage plate state", () => {
  it("loads site preferences, renders the picker before the plate, and keeps all 51 choices", async () => {
    api.listPreferredPlateStates.mockResolvedValue({ preferred: ["OK", "TX"] });
    renderPage();

    await waitFor(() => expect(api.listPreferredPlateStates).toHaveBeenCalledWith(42));
    const trigger = screen.getByRole("button", { name: "Select plate state" });
    const plateInput = screen.getByTestId("input-vehicle-plate");
    expect(trigger.compareDocumentPosition(plateInput) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    await userEvent.setup().click(trigger);
    expect(screen.getAllByRole("option")).toHaveLength(51);
    expect(screen.getAllByRole("option").slice(0, 3).map((option) => option.textContent)).toEqual([
      "Oklahoma (OK)",
      "Texas (TX)",
      "Alabama (AL)",
    ]);
  });

  it("uses the national fallback when ranking fails", async () => {
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

  it("disables and blocks guest-session submission for a plate without state with an accessible error", async () => {
    renderPage();
    await screen.findByTestId("input-first-name");
    fillRequiredIdentity();
    fireEvent.change(screen.getByTestId("input-vehicle-plate"), { target: { value: "ABC123" } });

    expect((screen.getByTestId("button-guest-signin") as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByRole("alert").textContent).toBe("gatekeeper.plateStateRequired");
    expect(api.startGuestSession).not.toHaveBeenCalled();
    expect(geolocationMock).not.toHaveBeenCalled();
  });

  it("preserves the selected state across step navigation, sends both fields, and clears them after checkout", async () => {
    renderPage();
    await screen.findByTestId("input-first-name");
    fillRequiredIdentity();
    await selectState("Texas (TX)");
    fireEvent.change(screen.getByTestId("input-vehicle-plate"), { target: { value: "abc123" } });
    fireEvent.click(screen.getByTestId("button-guest-signin"));

    await waitFor(() => expect(api.startGuestSession).toHaveBeenCalledTimes(1));
    expect(api.startGuestSession.mock.calls[0][0]).toMatchObject({
      plateState: "TX",
      vehiclePlate: "ABC123",
    });

    fireEvent.click(screen.getByTestId("button-back"));
    expect(screen.getByRole("button", { name: "Selected plate state: Texas (TX)" })).toBeTruthy();
    expect((screen.getByTestId("input-vehicle-plate") as HTMLInputElement).value).toBe("ABC123");
    fireEvent.click(screen.getByTestId("button-guest-signin"));
    await waitFor(() => expect(api.startGuestSession).toHaveBeenCalledTimes(2));

    fireEvent.click(screen.getByTestId("host-option-partner:7"));
    fireEvent.click(screen.getByTestId("button-check-in"));
    await waitFor(() => expect(api.checkIn).toHaveBeenCalledTimes(1));
    expect(api.checkIn.mock.calls[0][0]).toMatchObject({
      plateState: "TX",
      vehiclePlate: "ABC123",
    });

    fireEvent.click(await screen.findByTestId("button-check-out"));
    await waitFor(() => expect(api.guestLogout).toHaveBeenCalledTimes(1));
    expect(screen.getByRole("button", { name: "Select plate state" })).toBeTruthy();
    expect((screen.getByTestId("input-vehicle-plate") as HTMLInputElement).value).toBe("");
  });

  it("restores normalized guest-session values and omits a stray selected state when the plate is blank", async () => {
    api.guestMe.mockResolvedValue({
      ...EMPTY_SESSION,
      profile: { ...EMPTY_SESSION.profile, vehiclePlate: "RESTORED", plateState: "TX" },
    });
    renderPage();

    expect(await screen.findByRole("button", { name: "Selected plate state: Texas (TX)" })).toBeTruthy();
    expect((screen.getByTestId("input-vehicle-plate") as HTMLInputElement).value).toBe("RESTORED");
    fillRequiredIdentity();
    fireEvent.change(screen.getByTestId("input-vehicle-plate"), { target: { value: "" } });
    fireEvent.click(screen.getByTestId("button-guest-signin"));

    await waitFor(() => expect(api.startGuestSession).toHaveBeenCalledTimes(1));
    expect(api.startGuestSession.mock.calls[0][0]).toMatchObject({
      plateState: undefined,
      vehiclePlate: undefined,
    });
  });

  it("evicts visitor A and restores visitor B with the same normal-lived query cache", async () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: 60_000 } },
    });
    const visitorASession = {
      ...EMPTY_SESSION,
      guestSessionId: 101,
      profile: { ...EMPTY_SESSION.profile, vehiclePlate: "VISITOR-A", plateState: "TX" },
    };
    const visitorBSession = {
      ...EMPTY_SESSION,
      guestSessionId: 202,
      profile: { ...EMPTY_SESSION.profile, vehiclePlate: "VISITOR-B", plateState: "OK" },
    };
    api.guestMe.mockResolvedValue(visitorASession);
    api.myActive.mockResolvedValueOnce({
      id: 99,
      siteLocationId: 42,
      siteName: "Acme HQ",
      hostType: "partner",
      hostPartnerName: "Acme Partner",
      hostVendorName: null,
      purpose: "Inspection",
      vehiclePlate: "VISITOR-A",
      plateState: "TX",
      checkInTime: "2026-08-27T12:00:00.000Z",
    });

    const visitorA = renderPage(client);
    fireEvent.click(await screen.findByTestId("button-check-out"));
    await waitFor(() => expect(api.guestLogout).toHaveBeenCalledTimes(1));
    expect((screen.getByTestId("input-vehicle-plate") as HTMLInputElement).value).toBe("");

    api.startGuestSession.mockResolvedValue(visitorBSession);
    fillRequiredIdentity();
    fireEvent.click(screen.getByTestId("button-guest-signin"));
    await waitFor(() => expect(api.startGuestSession).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByTestId("button-back"));
    expect((screen.getByTestId("input-vehicle-plate") as HTMLInputElement).value).toBe("VISITOR-B");
    expect(screen.getByRole("button", { name: "Selected plate state: Oklahoma (OK)" })).toBeTruthy();

    visitorA.unmount();
    api.myActive.mockResolvedValue(null);
    api.guestMe.mockResolvedValue(visitorBSession);
    renderPage(client);
    const visitorBPlate = await screen.findByTestId("input-vehicle-plate") as HTMLInputElement;
    await waitFor(() => expect(visitorBPlate.value).toBe("VISITOR-B"));
    expect(visitorBPlate.value).not.toBe("VISITOR-A");
    expect(await screen.findByRole("button", { name: "Selected plate state: Oklahoma (OK)" })).toBeTruthy();
  });
});
