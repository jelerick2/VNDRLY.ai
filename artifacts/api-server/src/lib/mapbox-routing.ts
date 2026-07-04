export type RouteCoordinate = {
  latitude: number;
  longitude: number;
};

export type RouteEstimate = {
  provider: "mapbox";
  trafficAware: boolean;
  distanceMiles: number;
  durationMinutes: number;
  routeConfidence: "high" | "medium" | "low";
};

export type RouteEstimateResult =
  | ({ ok: true } & RouteEstimate)
  | { ok: false; errorCode: "mapbox.missing_token" | "mapbox.request_failed" | "mapbox.no_route"; message: string };

type EstimateArgs = {
  origin: RouteCoordinate;
  destination: RouteCoordinate;
};

type EstimateOptions = {
  accessToken?: string | null;
  fetchImpl?: typeof fetch;
};

const METERS_PER_MILE = 1609.344;

function isFiniteCoordinate(coord: RouteCoordinate): boolean {
  return (
    Number.isFinite(coord.latitude) &&
    Number.isFinite(coord.longitude) &&
    coord.latitude >= -90 &&
    coord.latitude <= 90 &&
    coord.longitude >= -180 &&
    coord.longitude <= 180
  );
}

export async function estimateMapboxDrivingRoute(
  args: EstimateArgs,
  options: EstimateOptions = {},
): Promise<RouteEstimateResult> {
  const accessToken = options.accessToken ?? process.env.MAPBOX_ACCESS_TOKEN ?? process.env.MAPBOX_API_KEY ?? "";
  if (!accessToken.trim()) {
    return {
      ok: false,
      errorCode: "mapbox.missing_token",
      message: "Mapbox routing is not configured.",
    };
  }
  if (!isFiniteCoordinate(args.origin) || !isFiniteCoordinate(args.destination)) {
    return {
      ok: false,
      errorCode: "mapbox.no_route",
      message: "Route coordinates are invalid.",
    };
  }

  const url = new URL(
    `https://api.mapbox.com/directions/v5/mapbox/driving-traffic/${args.origin.longitude},${args.origin.latitude};${args.destination.longitude},${args.destination.latitude}`,
  );
  url.searchParams.set("access_token", accessToken);
  url.searchParams.set("overview", "false");
  url.searchParams.set("alternatives", "false");
  url.searchParams.set("geometries", "geojson");

  const fetchImpl = options.fetchImpl ?? fetch;
  let response: Response;
  try {
    response = await fetchImpl(url.toString());
  } catch {
    return {
      ok: false,
      errorCode: "mapbox.request_failed",
      message: "Mapbox routing request failed.",
    };
  }
  if (!response.ok) {
    return {
      ok: false,
      errorCode: "mapbox.request_failed",
      message: `Mapbox routing returned HTTP ${response.status}.`,
    };
  }

  const body = (await response.json()) as {
    routes?: Array<{ distance?: unknown; duration?: unknown }>;
  };
  const route = body.routes?.[0];
  const distanceMeters = typeof route?.distance === "number" ? route.distance : null;
  const durationSeconds = typeof route?.duration === "number" ? route.duration : null;
  if (distanceMeters == null || durationSeconds == null) {
    return {
      ok: false,
      errorCode: "mapbox.no_route",
      message: "Mapbox did not return a route.",
    };
  }

  return {
    ok: true,
    provider: "mapbox",
    trafficAware: true,
    distanceMiles: Math.round((distanceMeters / METERS_PER_MILE) * 10) / 10,
    durationMinutes: Math.max(1, Math.round(durationSeconds / 60)),
    routeConfidence: "high",
  };
}
