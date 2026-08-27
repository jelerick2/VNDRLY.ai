import * as React from "react";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

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

vi.mock("@/lib/visits-api", () => ({
  visitsApi: {
    getSiteContext: vi.fn(),
    guestMe: vi.fn(),
    listPreferredPlateStates: vi.fn(),
    myActive: vi.fn(),
    startGuestSession: vi.fn(),
    checkIn: vi.fn(),
    checkOut: vi.fn(),
    guestLogout: vi.fn(),
  },
}));

import i18n from "@/lib/i18n";
import VisitPublicPage from "./visit-public";
import { visitsApi } from "@/lib/visits-api";

function renderPage() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, refetchOnWindowFocus: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
  return render(
    <QueryClientProvider client={client}>
      <VisitPublicPage siteCode="ABC123" />
    </QueryClientProvider>,
  );
}

beforeEach(async () => {
  await i18n.changeLanguage("es");

  vi.mocked(visitsApi.getSiteContext).mockReset();
  vi.mocked(visitsApi.guestMe).mockReset();
  vi.mocked(visitsApi.listPreferredPlateStates).mockReset();
  vi.mocked(visitsApi.myActive).mockReset();
  vi.mocked(visitsApi.startGuestSession).mockReset();

  vi.mocked(visitsApi.getSiteContext).mockResolvedValue({
    site: {
      id: 1,
      name: "Acme Yard",
      address: "123 Main St",
      latitude: 0,
      longitude: 0,
      siteRadiusMeters: 100,
      siteCode: "ABC123",
    },
    partner: {
      id: 7,
      name: "Acme Partner",
      logoUrl: null,
      logoSquareUrl: null,
      brandPrimaryColor: null,
      brandAccentColor: null,
    },
    vendors: [],
  });
  vi.mocked(visitsApi.myActive).mockResolvedValue(null);
  const guestSession = {
    guestSessionId: 1,
    role: "guest" as const,
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
  vi.mocked(visitsApi.guestMe).mockResolvedValue(guestSession);
  vi.mocked(visitsApi.listPreferredPlateStates).mockResolvedValue({
    preferred: ["CA", "TX", "NY", "FL", "OH"],
  });
  vi.mocked(visitsApi.startGuestSession).mockResolvedValue(
    { ...guestSession, token: "guest-token" },
  );
});

afterEach(async () => {
  await i18n.changeLanguage("en");
});

describe("Visit public page — Spanish copy", () => {
  it("renders heading, safety label, host picker prompt, and check-in button in Spanish", async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Acceso de visitante")).toBeTruthy();
    });
    // Trailing " *" is appended by the page after the translated label.
    expect(
      screen.getByText(/Seguiré todas las reglas de seguridad del sitio\./),
    ).toBeTruthy();
    expect(document.body.textContent ?? "").not.toMatch(/visitor\.public\./);

    const user = userEvent.setup();
    await user.type(screen.getByTestId("input-first-name"), "Juan");
    await user.type(screen.getByTestId("input-last-name"), "Pérez");
    await user.type(screen.getByTestId("input-phone"), "5555550123");
    await user.type(screen.getByTestId("input-email"), "juan@example.com");
    await user.type(screen.getByTestId("input-company"), "Acme");
    await user.click(screen.getByRole("button", { name: "Select plate state" }));
    await user.click(screen.getByRole("option", { name: "California (CA)" }));
    await user.type(screen.getByTestId("input-vehicle-plate"), "ABC123");
    await user.type(screen.getByTestId("input-purpose"), "entrega");
    await user.click(screen.getByTestId("switch-safety"));
    await user.click(screen.getByTestId("button-guest-signin"));

    await waitFor(() => {
      expect(screen.getByText("¿A quién visita?")).toBeTruthy();
    });
    expect(screen.getByTestId("button-check-in").textContent?.trim()).toBe(
      "Registrar entrada",
    );
    expect(screen.getByText("Acceso de visitante")).toBeTruthy();
    expect(document.body.textContent ?? "").not.toMatch(/visitor\.public\./);
  });
});
