export type AskVLocationContext = {
  latitude: number;
  longitude: number;
  accuracyMeters: number | null;
  capturedAt: string;
  source: "mobile_device";
};

export type AskVLocationPermission = {
  status: "granted" | "denied" | "undetermined" | string;
};

type ExpoLocationLike = {
  coords: {
    latitude: number;
    longitude: number;
    accuracy?: number | null;
  };
  timestamp: number;
};

export type AskVLocationProvider<TAccuracy = unknown> = {
  getForegroundPermissionsAsync: () => Promise<AskVLocationPermission>;
  requestForegroundPermissionsAsync: () => Promise<AskVLocationPermission>;
  getCurrentPositionAsync: (options: { accuracy: TAccuracy }) => Promise<ExpoLocationLike>;
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

export async function readAskVCurrentLocationForMessage<TAccuracy>(
  message: string,
  provider: AskVLocationProvider<TAccuracy>,
  accuracy: TAccuracy,
): Promise<AskVLocationContext | null> {
  if (!shouldAttachAskVLocation(message)) return null;
  try {
    const existingPermission = await provider.getForegroundPermissionsAsync();
    const permission =
      existingPermission.status === "granted"
        ? existingPermission
        : await provider.requestForegroundPermissionsAsync();
    if (permission.status !== "granted") return null;
    const loc = await provider.getCurrentPositionAsync({ accuracy });
    return buildAskVLocationContext(loc);
  } catch {
    return null;
  }
}
