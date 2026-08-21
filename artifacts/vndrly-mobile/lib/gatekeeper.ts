import * as Location from "expo-location";

import { apiFetch } from "./api";
import type { ActiveVisit, SiteContext } from "./guest";
import { buildHostOptions, parseDurationMinutes } from "./visitorCheckin";

export type GatekeeperVisitInput = {
  ctx: SiteContext;
  hostKey: string;
  firstName: string;
  lastName: string;
  company: string;
  phone: string;
  email: string;
  vehiclePlate: string;
  purpose: string;
  durationStr: string;
  platePhotoUrl?: string;
  vehiclePhotoUrl?: string;
};

export type GatekeeperSubmitResult =
  | { ok: true; visitId: number }
  | { ok: false; reason: "missing-name" | "no-host" | "location-denied" };

export async function fetchGatekeeperVisits(): Promise<ActiveVisit[]> {
  const rows = await apiFetch<Array<ActiveVisit & { checkOutTime?: string | null }>>("/api/visits");
  return rows.filter((row) => !row.checkOutTime);
}

export async function gatekeeperCheckOut(visitId: number): Promise<void> {
  let latitude: number | undefined;
  let longitude: number | undefined;
  try {
    const perm = await Location.requestForegroundPermissionsAsync();
    if (perm.status === "granted") {
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      latitude = pos.coords.latitude;
      longitude = pos.coords.longitude;
    }
  } catch {
    // GPS is best-effort for check-out; the server still records time-out.
  }
  await apiFetch(`/api/visits/gate/${visitId}/check-out`, {
    method: "POST",
    body: JSON.stringify({ latitude, longitude }),
  });
}

export async function submitGatekeeperVisit(
  input: GatekeeperVisitInput,
): Promise<GatekeeperSubmitResult> {
  if (!input.firstName.trim() || !input.lastName.trim()) {
    return { ok: false, reason: "missing-name" };
  }
  const host = buildHostOptions(input.ctx).find((o) => o.key === input.hostKey);
  if (!host) return { ok: false, reason: "no-host" };

  const perm = await Location.requestForegroundPermissionsAsync();
  if (perm.status !== "granted") return { ok: false, reason: "location-denied" };
  const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });

  const res = await apiFetch<{ id: number }>("/api/visits/gate/check-in", {
    method: "POST",
    body: JSON.stringify({
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      company: input.company.trim() || undefined,
      phone: input.phone.trim() || undefined,
      email: input.email.trim() || undefined,
      siteLocationId: input.ctx.site.id,
      hostType: host.type,
      hostPartnerId: host.type === "partner" ? host.id : undefined,
      hostVendorId: host.type === "vendor" ? host.id : undefined,
      vehiclePlate: input.vehiclePlate.trim() || undefined,
      purpose: input.purpose.trim() || undefined,
      expectedDurationMinutes: parseDurationMinutes(input.durationStr),
      ...(input.platePhotoUrl ? { platePhotoUrl: input.platePhotoUrl } : {}),
      ...(input.vehiclePhotoUrl ? { vehiclePhotoUrl: input.vehiclePhotoUrl } : {}),
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
    }),
  });
  return { ok: true, visitId: res.id };
}
