import { lazy, Suspense, useMemo } from "react";
import type { MapboxCircle, MapboxPoint } from "@/components/mapbox-map";

const LazyMapboxMap = lazy(() =>
  import("@/components/mapbox-map").then((mod) => ({ default: mod.MapboxMap })),
);

export type SiteLocationMapProps = {
  lat: number;
  lng: number;
  radiusMeters?: number | null;
  onMove?: (lat: number, lng: number) => void;
  height?: number | string;
  aspectRatio?: string;
  draggable?: boolean;
  tileLayer?: "satellite" | "street";
  className?: string;
};

export function SiteLocationMap({
  lat,
  lng,
  radiusMeters,
  onMove,
  height = 240,
  aspectRatio,
  draggable = true,
  tileLayer = "satellite",
  className,
}: SiteLocationMapProps) {
  const points = useMemo<MapboxPoint[]>(
    () => [
      {
        id: "site",
        latitude: lat,
        longitude: lng,
        color: "var(--brand-primary, #DC2626)",
        label: "S",
        title: "Site location",
      },
    ],
    [lat, lng],
  );
  const circles = useMemo<MapboxCircle[]>(
    () =>
      typeof radiusMeters === "number" && radiusMeters > 0
        ? [
            {
              id: "site-radius",
              latitude: lat,
              longitude: lng,
              radiusMeters,
              color: "var(--brand-primary, #DC2626)",
              opacity: 0.08,
            },
          ]
        : [],
    [lat, lng, radiusMeters],
  );
  const containerStyle: React.CSSProperties | undefined = aspectRatio
    ? { aspectRatio, width: "100%" }
    : undefined;

  return (
    <div
      className={`overflow-hidden rounded-md border ${className ?? ""}`.trim()}
      style={containerStyle}
      data-testid="site-location-map"
    >
      <Suspense
        fallback={
          <div
            className="flex items-center justify-center bg-muted/40 text-sm text-muted-foreground"
            style={{ height: aspectRatio ? "100%" : height }}
          >
            Loading...
          </div>
        }
      >
        <LazyMapboxMap
          points={points}
          circles={circles}
          center={[lng, lat]}
          zoom={15}
          styleKind={tileLayer}
          height={aspectRatio ? "100%" : height}
          scrollZoom={false}
          fitToData={false}
          onPointDrag={draggable && onMove ? (_id, nextLat, nextLng) => onMove(nextLat, nextLng) : undefined}
        />
      </Suspense>
    </div>
  );
}
