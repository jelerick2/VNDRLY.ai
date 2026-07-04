import React, { useMemo } from "react";
import { StyleSheet, Text, View, type DimensionValue } from "react-native";
import Mapbox from "@rnmapbox/maps";

import { useColors } from "@/hooks/useColors";
import { readMapboxAccessToken, type MapboxMapStyle } from "@/lib/maps";

export type NativeMapPoint = {
  id: string;
  latitude: number;
  longitude: number;
  color?: string;
  label?: string;
  title?: string | null;
};

export type NativeMapLine = {
  id: string;
  coordinates: Array<[number, number]>;
  color?: string;
  width?: number;
};

export type NativeMapCircle = {
  id: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  color?: string;
  opacity?: number;
};

type Props = {
  points?: NativeMapPoint[];
  lines?: NativeMapLine[];
  circles?: NativeMapCircle[];
  height?: DimensionValue;
  center?: [number, number];
  zoom?: number;
  styleKind?: MapboxMapStyle;
  selectedPointId?: string | null;
  onPointPress?: (id: string) => void;
};

const token = readMapboxAccessToken();
if (token) {
  Mapbox.setAccessToken(token);
}

function isValidPoint(point: { latitude: number; longitude: number }): boolean {
  return (
    Number.isFinite(point.latitude) &&
    Number.isFinite(point.longitude) &&
    point.latitude >= -90 &&
    point.latitude <= 90 &&
    point.longitude >= -180 &&
    point.longitude <= 180
  );
}

function circlePolygon(circle: NativeMapCircle): GeoJSON.Feature<GeoJSON.Polygon> {
  const steps = 64;
  const coords: Array<[number, number]> = [];
  const latRad = (circle.latitude * Math.PI) / 180;
  const metersPerDegreeLat = 111_320;
  const metersPerDegreeLng = Math.max(1, metersPerDegreeLat * Math.cos(latRad));
  for (let i = 0; i <= steps; i += 1) {
    const angle = (i / steps) * Math.PI * 2;
    coords.push([
      circle.longitude + (Math.cos(angle) * circle.radiusMeters) / metersPerDegreeLng,
      circle.latitude + (Math.sin(angle) * circle.radiusMeters) / metersPerDegreeLat,
    ]);
  }
  return {
    type: "Feature",
    properties: {
      color: circle.color ?? "#2563eb",
      opacity: circle.opacity ?? 0.14,
    },
    geometry: {
      type: "Polygon",
      coordinates: [coords],
    },
  };
}

function boundsFromPoints(points: NativeMapPoint[], lines: NativeMapLine[], circles: NativeMapCircle[]) {
  const coords: Array<[number, number]> = [];
  for (const point of points) coords.push([point.longitude, point.latitude]);
  for (const line of lines) {
    for (const [lat, lng] of line.coordinates) coords.push([lng, lat]);
  }
  for (const circle of circles) {
    const delta = circle.radiusMeters / 111_320;
    coords.push([circle.longitude - delta, circle.latitude - delta]);
    coords.push([circle.longitude + delta, circle.latitude + delta]);
  }
  if (coords.length < 2) return null;
  const lngs = coords.map(([lng]) => lng);
  const lats = coords.map(([, lat]) => lat);
  return {
    ne: [Math.max(...lngs), Math.max(...lats)] as [number, number],
    sw: [Math.min(...lngs), Math.min(...lats)] as [number, number],
  };
}

export default function MapboxNativeMap({
  points = [],
  lines = [],
  circles = [],
  height = 320,
  center,
  zoom = 12,
  styleKind = "satellite",
  selectedPointId,
  onPointPress,
}: Props) {
  const colors = useColors();
  const validPoints = useMemo(() => points.filter(isValidPoint), [points]);
  const validLines = useMemo(
    () =>
      lines
        .map((line) => ({
          ...line,
          coordinates: line.coordinates.filter(([lat, lng]) =>
            isValidPoint({ latitude: lat, longitude: lng }),
          ),
        }))
        .filter((line) => line.coordinates.length >= 2),
    [lines],
  );
  const validCircles = useMemo(() => circles.filter(isValidPoint), [circles]);
  const lineShape = useMemo<GeoJSON.FeatureCollection<GeoJSON.LineString>>(
    () => ({
      type: "FeatureCollection",
      features: validLines.map((line) => ({
        type: "Feature",
        properties: {
          color: line.color ?? colors.primary,
          width: line.width ?? 3,
        },
        geometry: {
          type: "LineString",
          coordinates: line.coordinates.map(([lat, lng]) => [lng, lat]),
        },
      })),
    }),
    [colors.primary, validLines],
  );
  const circleShape = useMemo<GeoJSON.FeatureCollection<GeoJSON.Polygon>>(
    () => ({
      type: "FeatureCollection",
      features: validCircles.map(circlePolygon),
    }),
    [validCircles],
  );
  const cameraBounds = useMemo(
    () => boundsFromPoints(validPoints, validLines, validCircles),
    [validCircles, validLines, validPoints],
  );
  const cameraCenter =
    center ??
    (validPoints[0]
      ? ([validPoints[0].longitude, validPoints[0].latitude] as [number, number])
      : ([-98.35, 39.5] as [number, number]));
  const styleURL =
    styleKind === "street" ? Mapbox.StyleURL.Street : Mapbox.StyleURL.SatelliteStreet;

  if (!token) {
    return (
      <View style={[styles.empty, { height, backgroundColor: colors.muted }]}>
        <Text style={{ color: colors.mutedForeground, fontSize: 13 }}>
          Mapbox is not configured.
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.root, { height }]}>
      <Mapbox.MapView style={styles.map} styleURL={styleURL} logoEnabled={false}>
        <Mapbox.Camera
          zoomLevel={zoom}
          centerCoordinate={cameraCenter}
          bounds={
            cameraBounds
              ? {
                  ne: cameraBounds.ne,
                  sw: cameraBounds.sw,
                  paddingTop: 48,
                  paddingBottom: 48,
                  paddingLeft: 48,
                  paddingRight: 48,
                }
              : undefined
          }
        />
        {validCircles.length > 0 ? (
          <Mapbox.ShapeSource id="mapbox-native-circles" shape={circleShape}>
            <Mapbox.FillLayer
              id="mapbox-native-circle-fill"
              style={{
                fillColor: ["get", "color"],
                fillOpacity: ["get", "opacity"],
              }}
            />
            <Mapbox.LineLayer
              id="mapbox-native-circle-line"
              style={{ lineColor: ["get", "color"], lineWidth: 1.5, lineOpacity: 0.85 }}
            />
          </Mapbox.ShapeSource>
        ) : null}
        {validLines.length > 0 ? (
          <Mapbox.ShapeSource id="mapbox-native-lines" shape={lineShape}>
            <Mapbox.LineLayer
              id="mapbox-native-line-layer"
              style={{
                lineColor: ["get", "color"],
                lineWidth: ["get", "width"],
                lineOpacity: 0.85,
              }}
            />
          </Mapbox.ShapeSource>
        ) : null}
        {validPoints.map((point) => {
          const selected = point.id === selectedPointId;
          const color = point.color ?? colors.primary;
          return (
            <Mapbox.PointAnnotation
              key={point.id}
              id={point.id}
              coordinate={[point.longitude, point.latitude]}
              onSelected={() => onPointPress?.(point.id)}
            >
              <View
                style={[
                  styles.pin,
                  {
                    backgroundColor: color,
                    borderColor: selected ? "#ffffff" : "rgba(255,255,255,0.92)",
                    transform: [{ scale: selected ? 1.18 : 1 }],
                  },
                ]}
              >
                <Text style={styles.pinText} numberOfLines={1}>
                  {point.label ?? "•"}
                </Text>
              </View>
            </Mapbox.PointAnnotation>
          );
        })}
      </Mapbox.MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    minHeight: 180,
    overflow: "hidden",
  },
  map: {
    flex: 1,
  },
  empty: {
    alignItems: "center",
    justifyContent: "center",
  },
  pin: {
    minWidth: 28,
    height: 28,
    paddingHorizontal: 6,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000000",
    shadowOpacity: 0.25,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
  },
  pinText: {
    color: "#ffffff",
    fontSize: 10,
    fontFamily: "Inter_700Bold",
  },
});
