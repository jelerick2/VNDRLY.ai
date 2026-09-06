export type AskVVisitorCheckInArgs = {
  firstName?: string;
  lastName?: string;
  company?: string;
  vehiclePlate?: string;
  plateState?: string;
  purpose?: string;
  notes?: string;
  expectedDurationMinutes?: number;
  siteLocationId?: number;
  hostType?: "partner" | "vendor";
};

export type AskVCheckoutVisit = {
  id: number;
  firstName?: string | null;
  lastName?: string | null;
  company?: string | null;
  vehiclePlate?: string | null;
};

export function gateFillToAskVCheckIn(
  fill: {
    firstName?: string;
    lastName?: string;
    company?: string;
    vehiclePlate?: string;
    plateState?: string;
    purpose?: string;
    notes?: string;
    expectedDuration?: string;
  },
  extras: { siteLocationId?: number; hostType?: "partner" | "vendor" } = {},
): AskVVisitorCheckInArgs {
  const minutes = fill.expectedDuration ? Number(fill.expectedDuration) : undefined;
  return {
    firstName: fill.firstName,
    lastName: fill.lastName,
    company: fill.company,
    vehiclePlate: fill.vehiclePlate,
    plateState: fill.plateState,
    purpose: fill.purpose,
    notes: fill.notes,
    expectedDurationMinutes: Number.isFinite(minutes) ? minutes : undefined,
    siteLocationId: extras.siteLocationId,
    hostType: extras.hostType,
  };
}

export function missingAskVCheckInFields(args: AskVVisitorCheckInArgs): string[] {
  const missing: string[] = [];
  if (!String(args.firstName ?? "").trim()) missing.push("firstName");
  if (!String(args.lastName ?? "").trim()) missing.push("lastName");
  if (typeof args.siteLocationId !== "number") missing.push("siteLocationId");
  if (args.hostType !== "partner" && args.hostType !== "vendor") missing.push("hostType");
  return missing;
}

function normalize(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

function normalizePlate(value: string | null | undefined): string {
  return (value ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function matchAskVCheckoutVisits<T extends AskVCheckoutVisit>(
  visits: T[],
  fill: { firstName?: string; lastName?: string; vehiclePlate?: string },
): T[] {
  const plate = normalizePlate(fill.vehiclePlate);
  const firstName = normalize(fill.firstName);
  const lastName = normalize(fill.lastName);
  if (!plate && !firstName && !lastName) return [];
  return visits.filter((visit) => {
    if (plate && normalizePlate(visit.vehiclePlate) !== plate) return false;
    if (firstName && normalize(visit.firstName) !== firstName) return false;
    if (lastName && normalize(visit.lastName) !== lastName) return false;
    return true;
  });
}
