import { plateMatchesSearch, type PlateStateCode } from "@workspace/plate-state";

export const GATE_HISTORY_DAYS = 30;

export type GateHistoryVisit = {
  id: number;
  firstName?: string | null;
  lastName?: string | null;
  company?: string | null;
  vehiclePlate?: string | null;
  plateState?: PlateStateCode | null;
  siteName?: string | null;
  purpose?: string | null;
  hostPartnerName?: string | null;
  hostVendorName?: string | null;
  checkInTime: string;
  checkOutTime?: string | null;
};

export function gateHistoryFromIso(now = new Date()): string {
  return new Date(now.getTime() - GATE_HISTORY_DAYS * 24 * 60 * 60 * 1000).toISOString();
}

function haystack(visit: GateHistoryVisit): string {
  return [
    visit.firstName,
    visit.lastName,
    `${visit.firstName ?? ""} ${visit.lastName ?? ""}`.trim(),
    visit.company,
    visit.vehiclePlate,
    visit.siteName,
    visit.purpose,
    visit.hostPartnerName,
    visit.hostVendorName,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function visitMatchesHistorySearch(visit: GateHistoryVisit, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return haystack(visit).includes(needle)
    || plateMatchesSearch(visit.plateState, visit.vehiclePlate, query);
}

export function filterGateHistory(visits: GateHistoryVisit[], query: string): GateHistoryVisit[] {
  return visits
    .filter((visit) => visitMatchesHistorySearch(visit, query))
    .sort((a, b) => Date.parse(b.checkInTime) - Date.parse(a.checkInTime));
}
