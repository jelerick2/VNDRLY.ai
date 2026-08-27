import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  transcribe: vi.fn(),
  list: vi.fn(),
  listAllVisits: vi.fn(),
  listAssignedGateSites: vi.fn(),
}));

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

vi.mock("@/lib/askv-transcribe", () => ({
  transcribeAskVRecording: (...args: unknown[]) => mocks.transcribe(...args),
}));

vi.mock("@/lib/visits-api", () => ({
  listAllVisits: (...args: unknown[]) => mocks.listAllVisits(...args),
  visitsApi: {
    list: (...args: unknown[]) => mocks.list(...args),
    listAssignedGateSites: (...args: unknown[]) => mocks.listAssignedGateSites(...args),
    getSiteContext: vi.fn(),
    readPlate: vi.fn(),
    gateCheckIn: vi.fn(),
    gateCheckOut: vi.fn(),
  },
}));

import GatekeeperPage from "./gatekeeper";
import { requestGateVoiceEntry } from "@/lib/gate-voice-launch";

class FakeMediaRecorder {
  static instances: FakeMediaRecorder[] = [];
  static isTypeSupported = () => true;

  mimeType = "audio/webm";
  state = "inactive";
  ondataavailable: ((event: { data: Blob }) => void) | null = null;
  onerror: (() => void) | null = null;
  onstop: (() => void) | null = null;
  start = vi.fn(() => {
    this.state = "recording";
  });
  stop = vi.fn(() => {
    this.state = "inactive";
    this.ondataavailable?.({ data: new Blob(["voice"], { type: this.mimeType }) });
    this.onstop?.();
  });

  constructor() {
    FakeMediaRecorder.instances.push(this);
  }
}

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

beforeEach(() => {
  FakeMediaRecorder.instances = [];
  mocks.list.mockResolvedValue([]);
  mocks.listAllVisits.mockResolvedValue([]);
  mocks.listAssignedGateSites.mockResolvedValue({ sites: [], defaultSite: null });
  mocks.transcribe.mockResolvedValue(
    "check in Bob Villa from NewCo plate ABC123 for equipment delivery",
  );
  vi.stubGlobal("MediaRecorder", FakeMediaRecorder);
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: {
      getUserMedia: vi.fn(async () => ({
        getTracks: () => [{ stop: vi.fn() }],
      })),
    },
  });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("GatekeeperPage voice entry", () => {
  it("records until the second press, transcribes, fills the draft, and asks for confirmation", async () => {
    renderPage();
    await screen.findByTestId("input-gate-first-name");

    act(() => requestGateVoiceEntry());
    await waitFor(() => expect(FakeMediaRecorder.instances).toHaveLength(1));
    const recorder = FakeMediaRecorder.instances[0];
    expect(recorder.start).toHaveBeenCalledTimes(1);
    expect(recorder.stop).not.toHaveBeenCalled();
    expect(screen.getByText("gatekeeper.voiceListening")).toBeTruthy();

    act(() => requestGateVoiceEntry());
    await waitFor(() => expect(recorder.stop).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(mocks.transcribe).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByTestId("gate-voice-checkin-confirmation")).toBeTruthy());

    expect((screen.getByTestId("input-gate-first-name") as HTMLInputElement).value).toBe("Bob");
    expect((screen.getByTestId("input-gate-last-name") as HTMLInputElement).value).toBe("Villa");
    expect((screen.getByTestId("input-gate-company") as HTMLInputElement).value).toBe("NewCo");
    expect((screen.getByTestId("input-gate-plate") as HTMLInputElement).value).toBe("ABC123");
    expect((screen.getByTestId("input-gate-purpose") as HTMLTextAreaElement).value).toBe("equipment delivery");
  });

  it("loads complete visit memory and replaces a plate-prefilled driver from a first-name prefix", async () => {
    const baseVisit = {
      phone: null,
      email: null,
      platePhotoUrl: null,
      vehiclePhotoUrl: null,
      purpose: "Delivery",
      expectedDurationMinutes: 60,
      hostType: "partner" as const,
      hostPartnerId: 7,
      hostVendorId: null,
      hostPartnerName: "Flywheel Energy",
      hostVendorName: null,
      siteLocationId: 309,
      siteName: "Flywheel Energy Spur",
      siteCode: "SITE-B40D77D2",
      checkOutTime: "2026-08-26T11:00:00Z",
      autoCheckedOut: false,
      checkInLatitude: 34.64,
      checkInLongitude: -97.66,
    };
    mocks.listAllVisits.mockResolvedValue([
      {
        ...baseVisit,
        id: 101,
        firstName: "Bob",
        lastName: "Villa",
        company: "Peak Energy",
        vehiclePlate: "51D4A1",
        checkInTime: "2026-08-26T10:00:00Z",
      },
      {
        ...baseVisit,
        id: 100,
        firstName: "Bonnie",
        lastName: "West",
        company: "Peak Energy",
        vehiclePlate: "TX9911",
        checkInTime: "2026-08-25T10:00:00Z",
      },
    ]);

    renderPage();
    const plate = await screen.findByTestId("input-gate-plate");
    fireEvent.change(plate, { target: { value: "51D-4A1" } });

    await waitFor(() => {
      expect((screen.getByTestId("input-gate-first-name") as HTMLInputElement).value).toBe("Bob");
      expect((screen.getByTestId("input-gate-last-name") as HTMLInputElement).value).toBe("Villa");
      expect((screen.getByTestId("input-gate-company") as HTMLInputElement).value).toBe("Peak Energy");
    });

    fireEvent.change(screen.getByTestId("input-gate-first-name"), { target: { value: "Bon" } });
    fireEvent.click(await screen.findByText("Bonnie West"));

    expect((screen.getByTestId("input-gate-first-name") as HTMLInputElement).value).toBe("Bonnie");
    expect((screen.getByTestId("input-gate-last-name") as HTMLInputElement).value).toBe("West");
    expect((screen.getByTestId("input-gate-company") as HTMLInputElement).value).toBe("Peak Energy");
    expect((screen.getByTestId("input-gate-plate") as HTMLInputElement).value).toBe("51D4A1");
  });
});
