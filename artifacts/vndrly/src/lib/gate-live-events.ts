export type KnownGateVisit = {
  id: number;
  firstName: string;
  lastName: string;
  company: string | null;
  vehiclePlate: string | null;
  platePhotoUrl: string | null;
  siteName: string | null;
  siteLocationId: number;
};

export type GateLiveFlash = {
  kind: "checked_in" | "checked_out";
  visitId: number;
  firstName: string;
  lastName: string;
  company: string | null;
  vehiclePlate: string | null;
  platePhotoUrl: string | null;
  siteName: string | null;
  at: string;
};

export type GateLiveSseEvent =
  | {
      type: "visit.checked_in";
      visit: {
        id: number;
        firstName: string;
        lastName: string;
        company: string | null;
        vehiclePlate: string | null;
        platePhotoUrl: string | null;
        siteName: string | null;
        siteLocationId: number;
        checkInTime: string;
      };
    }
  | {
      type: "visit.checked_out";
      visitId: number;
      siteLocationId: number;
      checkOutTime: string;
      firstName?: string;
      lastName?: string;
      company?: string | null;
      vehiclePlate?: string | null;
      platePhotoUrl?: string | null;
      siteName?: string | null;
      visitor?: {
        firstName: string;
        lastName: string;
        company: string | null;
        vehiclePlate: string | null;
        platePhotoUrl: string | null;
        siteName: string | null;
      };
    };

export function flashFromVisitSseEvent(
  event: GateLiveSseEvent,
  opts: { knownVisits: KnownGateVisit[]; siteLocationId: number | null },
): GateLiveFlash | null {
  const siteId = event.type === "visit.checked_in" ? event.visit.siteLocationId : event.siteLocationId;
  if (opts.siteLocationId != null && siteId !== opts.siteLocationId) return null;

  if (event.type === "visit.checked_in") {
    const visit = event.visit;
    return {
      kind: "checked_in",
      visitId: visit.id,
      firstName: visit.firstName,
      lastName: visit.lastName,
      company: visit.company,
      vehiclePlate: visit.vehiclePlate,
      platePhotoUrl: visit.platePhotoUrl,
      siteName: visit.siteName,
      at: visit.checkInTime,
    };
  }

  const fromEvent = event.visitor
    ? {
        firstName: event.visitor.firstName,
        lastName: event.visitor.lastName,
        company: event.visitor.company,
        vehiclePlate: event.visitor.vehiclePlate,
        platePhotoUrl: event.visitor.platePhotoUrl,
        siteName: event.visitor.siteName,
      }
    : event.firstName
      ? {
          firstName: event.firstName,
          lastName: event.lastName ?? "",
          company: event.company ?? null,
          vehiclePlate: event.vehiclePlate ?? null,
          platePhotoUrl: event.platePhotoUrl ?? null,
          siteName: event.siteName ?? null,
        }
      : opts.knownVisits.find((visit) => visit.id === event.visitId);

  if (!fromEvent) return null;
  return {
    kind: "checked_out",
    visitId: event.visitId,
    firstName: fromEvent.firstName,
    lastName: fromEvent.lastName,
    company: fromEvent.company,
    vehiclePlate: fromEvent.vehiclePlate,
    platePhotoUrl: fromEvent.platePhotoUrl,
    siteName: fromEvent.siteName,
    at: event.checkOutTime,
  };
}
