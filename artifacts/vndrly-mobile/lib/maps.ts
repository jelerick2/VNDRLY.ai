import { Linking, Platform } from "react-native";

export const MAP_TILE_SIZE = 256;
export const MAP_TILE_ZOOM = 15;
export type MapboxMapStyle = "satellite" | "street";

export type TileCoords = {
  url: string;
  offsetX: number;
  offsetY: number;
};

const MAPBOX_STYLES: Record<MapboxMapStyle, string> = {
  satellite: "satellite-streets-v12",
  street: "streets-v12",
};

export const MAPBOX_ATTRIBUTION =
  '&copy; <a href="https://www.mapbox.com/about/maps/">Mapbox</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

export function readMapboxAccessToken(): string {
  return (
    process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN ||
    process.env.EXPO_PUBLIC_MAPBOX_API_KEY ||
    process.env.MAPBOX_ACCESS_TOKEN ||
    ""
  ).trim();
}

function tilePosition(latitude: number, longitude: number, zoom: number) {
  const MAX_LAT = 85.05112878;
  const clampedLat = Math.max(-MAX_LAT, Math.min(MAX_LAT, latitude));
  const normalizedLng = ((((longitude + 180) % 360) + 360) % 360) - 180;
  const latRad = (clampedLat * Math.PI) / 180;
  const n = Math.pow(2, zoom);
  const xFloat = ((normalizedLng + 180) / 360) * n;
  const yFloat =
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n;
  const xTile = Math.floor(xFloat);
  const yTile = Math.floor(yFloat);
  const offsetX = (xFloat - xTile) * MAP_TILE_SIZE;
  const offsetY = (yFloat - yTile) * MAP_TILE_SIZE;
  return { xTile, yTile, offsetX, offsetY };
}

export function getMapboxStyleTileUrl(style: MapboxMapStyle = "satellite"): string {
  const token = readMapboxAccessToken();
  return `https://api.mapbox.com/styles/v1/mapbox/${MAPBOX_STYLES[style]}/tiles/256/{z}/{x}/{y}@2x?access_token=${encodeURIComponent(token)}`;
}

export function getMapboxStaticTile(
  latitude: number,
  longitude: number,
  zoom: number = MAP_TILE_ZOOM,
  style: MapboxMapStyle = "satellite",
): TileCoords {
  const { xTile, yTile, offsetX, offsetY } = tilePosition(latitude, longitude, zoom);
  return {
    url: getMapboxStyleTileUrl(style)
      .replace("{z}", String(zoom))
      .replace("{x}", String(xTile))
      .replace("{y}", String(yTile)),
    offsetX,
    offsetY,
  };
}

export function getOsmTile(
  latitude: number,
  longitude: number,
  zoom: number = MAP_TILE_ZOOM,
): TileCoords {
  if (readMapboxAccessToken()) return getMapboxStaticTile(latitude, longitude, zoom);
  const { xTile, yTile, offsetX, offsetY } = tilePosition(latitude, longitude, zoom);
  return {
    url: `https://tile.openstreetmap.org/${zoom}/${xTile}/${yTile}.png`,
    offsetX,
    offsetY,
  };
}

export async function openInMaps(
  latitude: number,
  longitude: number,
  label?: string,
): Promise<void> {
  const lat = latitude.toString();
  const lng = longitude.toString();
  const encodedLabel = label ? encodeURIComponent(label) : "";
  const urls: string[] = [];
  if (Platform.OS === "ios") {
    const q = encodedLabel ? `&q=${encodedLabel}` : "";
    urls.push(`http://maps.apple.com/?ll=${lat},${lng}${q}`);
  } else if (Platform.OS === "android") {
    const q = encodedLabel ? `(${encodedLabel})` : "";
    urls.push(`geo:${lat},${lng}?q=${lat},${lng}${q}`);
  }
  urls.push(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`);
  for (const url of urls) {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
        return;
      }
    } catch {
      // try next
    }
  }
  try {
    await Linking.openURL(urls[urls.length - 1]);
  } catch {
    // give up silently
  }
}
