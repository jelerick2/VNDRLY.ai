import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { StyleSheet, Text, View } from "react-native";

import MapboxNativeMap, { type NativeMapLine, type NativeMapPoint } from "@/components/MapboxNativeMap";
import { useColors } from "@/hooks/useColors";

export type RoutePoint = {
  id?: number | string;
  latitude: number;
  longitude: number;
  recordedAt?: string | Date | null;
};

type LatLngTime = {
  latitude: number;
  longitude: number;
  time?: string | Date | null;
};

type Props = {
  site?: { latitude: number; longitude: number; name?: string | null } | null;
  checkIn?: LatLngTime | null;
  checkOut?: LatLngTime | null;
  tracking?: RoutePoint[];
  height?: number;
  selectedTrackingId?: number | string | null;
  onSelectTracking?: (id: number | string | null) => void;
};

function isValidLatLng(lat: unknown, lng: unknown): boolean {
  return (
    typeof lat === "number" &&
    typeof lng === "number" &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

export function TicketRouteMap({
  site,
  checkIn,
  checkOut,
  tracking,
  height = 280,
  selectedTrackingId,
  onSelectTracking,
}: Props) {
  const colors = useColors();
  const { t } = useTranslation();

  const validSite =
    site && isValidLatLng(site.latitude, site.longitude) ? site : null;
  const validCheckIn =
    checkIn && isValidLatLng(checkIn.latitude, checkIn.longitude) ? checkIn : null;
  const validCheckOut =
    checkOut && isValidLatLng(checkOut.latitude, checkOut.longitude) ? checkOut : null;

  const sortedTracking = useMemo(() => {
    if (!tracking || tracking.length === 0) return [];
    return tracking
      .filter((p) => isValidLatLng(p.latitude, p.longitude))
      .slice()
      .sort((a, b) => {
        const at = a.recordedAt ? new Date(a.recordedAt).getTime() : 0;
        const bt = b.recordedAt ? new Date(b.recordedAt).getTime() : 0;
        return at - bt;
      });
  }, [tracking]);

  const points = useMemo<NativeMapPoint[]>(() => {
    const items: NativeMapPoint[] = [];
    if (validSite) {
      items.push({
        id: "site",
        latitude: validSite.latitude,
        longitude: validSite.longitude,
        color: colors.primary,
        label: "S",
        title: validSite.name ?? t("routeMap.siteFallback"),
      });
    }
    if (validCheckIn) {
      items.push({
        id: "check-in",
        latitude: validCheckIn.latitude,
        longitude: validCheckIn.longitude,
        color: "#16a34a",
        label: "In",
        title: t("routeMap.popupCheckIn"),
      });
    }
    for (let index = 0; index < sortedTracking.length; index += 1) {
      const point = sortedTracking[index]!;
      const id = point.id != null ? String(point.id) : `tracking-${index}`;
      items.push({
        id,
        latitude: point.latitude,
        longitude: point.longitude,
        color: id === String(selectedTrackingId) ? colors.primary : "#2563eb",
        label: String(index + 1),
        title: t("routeMap.popupTracking", { n: index + 1 }),
      });
    }
    if (validCheckOut) {
      items.push({
        id: "check-out",
        latitude: validCheckOut.latitude,
        longitude: validCheckOut.longitude,
        color: "#dc2626",
        label: "Out",
        title: t("routeMap.popupCheckOut"),
      });
    }
    return items;
  }, [colors.primary, selectedTrackingId, sortedTracking, t, validCheckIn, validCheckOut, validSite]);

  const lines = useMemo<NativeMapLine[]>(() => {
    const coordinates: Array<[number, number]> = [];
    if (validCheckIn) coordinates.push([validCheckIn.latitude, validCheckIn.longitude]);
    for (const point of sortedTracking) coordinates.push([point.latitude, point.longitude]);
    if (validCheckOut) coordinates.push([validCheckOut.latitude, validCheckOut.longitude]);
    return coordinates.length >= 2
      ? [{ id: "ticket-route", coordinates, color: "#2563eb", width: 4 }]
      : [];
  }, [sortedTracking, validCheckIn, validCheckOut]);

  const hasAnything =
    validSite || validCheckIn || validCheckOut || sortedTracking.length > 0;

  if (!hasAnything) {
    return (
      <View
        style={[
          styles.empty,
          { height, borderColor: colors.border, backgroundColor: colors.muted },
        ]}
      >
        <Text style={{ color: colors.mutedForeground, fontSize: 13 }}>
          {t("routeMap.noGps")}
        </Text>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.wrapper,
        { height, borderColor: colors.primary, backgroundColor: colors.muted },
      ]}
    >
      <MapboxNativeMap
        points={points}
        lines={lines}
        height="100%"
        styleKind="satellite"
        selectedPointId={selectedTrackingId != null ? String(selectedTrackingId) : null}
        onPointPress={(id) => {
          if (id.startsWith("tracking-") || id === "site" || id === "check-in" || id === "check-out") return;
          onSelectTracking?.(id);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderWidth: 2,
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 12,
  },
  empty: {
    borderWidth: 1,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
});
