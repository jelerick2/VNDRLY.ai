import * as React from "react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

// Task #153 — when a crew member's ticket transitions lifecycle stages
// the live SSE handler flashes the corresponding row in the side panel
// and the marker pin on the map itself. The map now renders through the
// shared Mapbox component, so this spec inspects the point model passed
// into that component instead of a renderer-specific marker DOM.

if (typeof globalThis.ResizeObserver === "undefined") {
  class ResizeObserverPolyfill {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  (globalThis as { ResizeObserver: unknown }).ResizeObserver =
    ResizeObserverPolyfill;
}

type FakeESListener = (ev: MessageEvent) => void;
class FakeEventSource {
  static instances: FakeEventSource[] = [];
  url: string;
  withCredentials: boolean;
  closed = false;
  onopen: ((ev: Event) => void) | null = null;
  onerror: ((ev: Event) => void) | null = null;
  onmessage: ((ev: MessageEvent) => void) | null = null;
  private listeners = new Map<string, Set<FakeESListener>>();
  constructor(url: string, init?: { withCredentials?: boolean }) {
    this.url = url;
    this.withCredentials = !!init?.withCredentials;
    FakeEventSource.instances.push(this);
  }
  addEventListener(type: string, fn: FakeESListener): void {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type)!.add(fn);
  }
  removeEventListener(type: string, fn: FakeESListener): void {
    this.listeners.get(type)?.delete(fn);
  }
  close(): void {
    this.closed = true;
  }
  dispatch(type: string, data: unknown): void {
    const set = this.listeners.get(type);
    if (!set) return;
    const ev = {
      data: typeof data === "string" ? data : JSON.stringify(data),
    } as MessageEvent;
    for (const fn of set) fn(ev);
  }
  fireOpen(): void {
    this.onopen?.(new Event("open"));
  }
}
(globalThis as { EventSource: unknown }).EventSource = FakeEventSource;

const vendorAdminUser = {
  userId: 1,
  role: "vendor" as const,
  displayName: "Op",
  partnerId: null,
  vendorId: 11,
  vendorRole: "office" as const,
  preferredLanguage: "en" as const,
  activeMembershipId: 1,
  availableMemberships: [
    {
      id: 1,
      role: "admin",
      entityType: "vendor",
      entityId: 11,
      entityName: "Acme",
    },
  ],
  requiresContextChoice: false,
};

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({
    user: vendorAdminUser,
    isLoading: false,
    login: async () => {},
    logout: async () => {},
    setPreferredLanguage: () => {},
    switchContext: async () => {},
  }),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn(), toasts: [] }),
  toast: vi.fn(),
}));

type StubMapboxPoint = {
  id: string;
  flashing?: boolean;
};

let latestMapboxPoints: StubMapboxPoint[] = [];

vi.mock("@/components/mapbox-map", () => ({
  MapboxMap: ({ points }: { points?: StubMapboxPoint[] }) => {
    latestMapboxPoints = points ?? [];
    return React.createElement("div", { "data-testid": "stub-mapbox-map" });
  },
}));

vi.mock("@/lib/visits-api", () => ({
  visitsApi: {
    list: vi.fn(async () => [] as unknown[]),
  },
}));

vi.mock("@workspace/api-client-react", () => ({
  useListSiteLocations: () => ({ data: [] }),
  getListSiteLocationsQueryKey: () => ["site-locations"],
}));

vi.mock("@/components/map/map-compliance-issues-card", () => ({
  MapComplianceIssuesCard: () => null,
}));

import { render, act, screen } from "@testing-library/react";
import CrewMapPage from "./crew-map";

const SEED_LOCATION = {
  employeeId: 42,
  employeeName: "Riley Field",
  ticketId: 7001,
  vendorId: 11,
  lifecycleState: "en_route",
  siteName: "Test Site",
  siteCode: "TS-1",
  siteLatitude: 30.27,
  siteLongitude: -97.74,
  latitude: 30.26,
  longitude: -97.73,
  batteryLevel: 0.8,
  heading: 90,
  speedMps: 12,
  recordedAt: new Date().toISOString(),
};

function findCrewPoint(): StubMapboxPoint {
  const point = latestMapboxPoints.find((p) => p.id === `crew-${SEED_LOCATION.employeeId}`);
  if (!point) {
    throw new Error(`No crew point found. Got: ${latestMapboxPoints.map((p) => p.id).join(", ")}`);
  }
  return point;
}

beforeEach(() => {
  FakeEventSource.instances = [];
  latestMapboxPoints = [];
  // Seed the page with one en-route crew member so the SSE ping below
  // is a true lifecycle transition, not a first sighting.
  (globalThis as { fetch: unknown }).fetch = vi.fn(async () =>
    new Response(
      JSON.stringify({ locations: [SEED_LOCATION] }),
      { status: 200 },
    ),
  );
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

function findLiveLocationsEventSource(): FakeEventSource {
  const es = FakeEventSource.instances.find((i) =>
    /\/api\/live-locations\/events(\?|$)/.test(i.url),
  );
  if (!es) {
    throw new Error(
      `No live-locations EventSource. Saw: ${FakeEventSource.instances
        .map((i) => i.url)
        .join(", ")}`,
    );
  }
  return es;
}

describe("crew-map page — pin flash on lifecycle transition (Task #153)", () => {
  it("renders the car pin without the flash ring at rest", async () => {
    render(<CrewMapPage />);
    // Let the initial fetch resolve so the seeded location renders.
    await act(async () => {
      await Promise.resolve();
    });
    expect(findCrewPoint().flashing).toBe(false);
  });

  it("adds the expanding ring overlay to the pin when an SSE ping flips lifecycle (en_route → on_site)", async () => {
    render(<CrewMapPage />);
    await act(async () => {
      await Promise.resolve();
    });
    const es = findLiveLocationsEventSource();
    act(() => {
      es.fireOpen();
    });

    // SSE ping for the same employee/ticket but a new lifecycle stage.
    // This is the demo-critical transition: dispatcher sees the pin
    // pulse the moment the field employee taps "Check In".
    act(() => {
      es.dispatch("location.ping", {
        type: "location.ping",
        location: {
          ...SEED_LOCATION,
          lifecycleState: "on_site",
          recordedAt: new Date(Date.now() + 1000).toISOString(),
        },
      });
    });

    expect(findCrewPoint().flashing).toBe(true);
  });

  it("removes the flash ring after the 2s flash window elapses", async () => {
    render(<CrewMapPage />);
    await act(async () => {
      await Promise.resolve();
    });
    const es = findLiveLocationsEventSource();
    act(() => {
      es.fireOpen();
    });
    act(() => {
      es.dispatch("location.ping", {
        type: "location.ping",
        location: {
          ...SEED_LOCATION,
          lifecycleState: "on_site",
          recordedAt: new Date(Date.now() + 1000).toISOString(),
        },
      });
    });
    expect(findCrewPoint().flashing).toBe(true);

    // The page schedules a 2s timer to clear the flashing state. Once
    // it fires, the pin re-renders without the ring overlay.
    act(() => {
      vi.advanceTimersByTime(2001);
    });
    expect(findCrewPoint().flashing).toBe(false);
  });
});
