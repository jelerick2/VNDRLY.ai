import type { VisitEvent } from "./visit-events";

export type VisitEventSession = {
  role: string;
  vendorId: number | null;
  partnerId: number | null;
  vendorRole?: string | null;
};

export function isGatekeeperVisitSession(session: VisitEventSession): boolean {
  return session.role === "vendor" && !!session.vendorId && session.vendorRole === "gatekeeper";
}

export function visitEventSiteId(ev: VisitEvent): number {
  return ev.type === "visit.checked_in" ? ev.visit.siteLocationId : ev.siteLocationId;
}

export function visitEventVisibleToSession(
  session: VisitEventSession,
  ev: VisitEvent,
  assignedSiteIds: ReadonlySet<number> | null = null,
): boolean {
  if (session.role === "admin") return true;
  if (isGatekeeperVisitSession(session) && assignedSiteIds) {
    return assignedSiteIds.has(visitEventSiteId(ev));
  }
  if (session.role === "vendor" && session.vendorId) {
    const vendorId = ev.type === "visit.checked_in" ? ev.visit.hostVendorId : ev.hostVendorId;
    return vendorId === session.vendorId;
  }
  if (session.role === "partner" && session.partnerId) {
    const partnerId = ev.type === "visit.checked_in" ? ev.visit.sitePartnerId : ev.sitePartnerId;
    return partnerId === session.partnerId;
  }
  return false;
}
