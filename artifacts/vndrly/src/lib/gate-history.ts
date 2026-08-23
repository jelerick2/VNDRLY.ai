import type { VisitorRow } from "@/lib/visits-api";

export const GATE_HISTORY_DAYS = 30;

export function gateHistoryFromIso(now = new Date()): string {
  return new Date(now.getTime() - GATE_HISTORY_DAYS * 24 * 60 * 60 * 1000).toISOString();
}

function haystack(visit: VisitorRow): string {
  return [
    visit.firstName,
    visit.lastName,
    `${visit.firstName} ${visit.lastName}`,
    visit.company,
    visit.vehiclePlate,
    visit.siteName,
    visit.purpose,
    visit.hostPartnerName,
    visit.hostVendorName,
    visit.phone,
    visit.email,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function visitMatchesHistorySearch(visit: VisitorRow, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return haystack(visit).includes(needle);
}

export function sortHistoryNewestFirst(visits: VisitorRow[]): VisitorRow[] {
  return [...visits].sort((a, b) => Date.parse(b.checkInTime) - Date.parse(a.checkInTime));
}

export function filterGateHistory(visits: VisitorRow[], query: string): VisitorRow[] {
  return sortHistoryNewestFirst(visits.filter((visit) => visitMatchesHistorySearch(visit, query)));
}
