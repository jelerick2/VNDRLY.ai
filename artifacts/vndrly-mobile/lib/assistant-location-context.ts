export type AskVLocationContext = {
  latitude: number;
  longitude: number;
  accuracyMeters: number | null;
  capturedAt: string;
  source: "mobile_device";
};

type ExpoLocationLike = {
  coords: {
    latitude: number;
    longitude: number;
    accuracy?: number | null;
  };
  timestamp: number;
};

const LOCATION_INTENT_RE =
  /\b(ticket|site|job|map|route|drive|driving|mile|miles|eta|how long|how far|near me|nearby|closest|geofence|check in|check-in)\b/i;

export function shouldAttachAskVLocation(message: string): boolean {
  return LOCATION_INTENT_RE.test(message);
}

export function buildAskVLocationContext(
  location: ExpoLocationLike,
): AskVLocationContext | null {
  const { latitude, longitude, accuracy } = location.coords;
  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return null;
  }
  return {
    latitude,
    longitude,
    accuracyMeters: typeof accuracy === "number" && Number.isFinite(accuracy) ? accuracy : null,
    capturedAt: new Date(location.timestamp).toISOString(),
    source: "mobile_device",
  };
}
