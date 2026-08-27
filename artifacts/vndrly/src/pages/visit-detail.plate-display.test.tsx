import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const getVisit = vi.hoisted(() => vi.fn());

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock("wouter", () => ({
  Link: ({ href, children }: { href: string; children: React.ReactNode }) =>
    React.createElement("a", { href }, children),
}));
vi.mock("@/lib/visits-api", () => ({ visitsApi: { get: getVisit } }));

import VisitDetailPage from "./visit-detail";

describe("VisitDetailPage plate display", () => {
  it("renders the state-qualified plate in the visit details", async () => {
    getVisit.mockResolvedValue({
      id: 88,
      firstName: "Taylor",
      lastName: "Reed",
      company: "Acme",
      phone: null,
      email: null,
      vehiclePlate: "ABC123",
      plateState: "TX",
      platePhotoUrl: null,
      vehiclePhotoUrl: null,
      purpose: "Delivery",
      expectedDurationMinutes: 60,
      hostType: "partner",
      hostPartnerId: 7,
      hostVendorId: null,
      hostPartnerName: "Acme Partner",
      hostVendorName: null,
      siteLocationId: 42,
      siteName: "Acme HQ",
      checkInTime: "2026-08-27T12:00:00Z",
      checkOutTime: null,
      autoCheckedOut: false,
      checkInLatitude: null,
      checkInLongitude: null,
      sitePartnerId: 7,
      checkOutLatitude: null,
      checkOutLongitude: null,
    });
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <VisitDetailPage id="88" />
      </QueryClientProvider>,
    );

    expect((await screen.findByTestId("visit-detail")).textContent).toContain("TX • ABC123");
  });
});
