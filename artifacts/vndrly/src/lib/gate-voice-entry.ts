import type { GateEntryDraft } from "@/lib/gate-entry-memory";
import { parseSpokenPlateState } from "@workspace/plate-state";

export type GateVoiceIntent = "check-in" | "check-out" | "fill";
export type GateVoiceCommand = { intent: GateVoiceIntent; fill: Partial<GateEntryDraft> };
export type GateCheckoutVisit = {
  id: number;
  firstName?: string | null;
  lastName?: string | null;
  company?: string | null;
  vehiclePlate?: string | null;
  checkInTime: string;
};

const CHECK_OUT = /\b(?:check\s*out|checking\s*out)\b/i;
const CHECK_IN = /\b(?:check\s*in|checking\s*in)\b/i;
const FIELD_LABELS = "license plate|plate|tag|driver name|driver|name|company|from|with|truck|vehicle|purpose|reason|here for|for|here to|duration|time|checking in|check in|checking out|check out";

function valueAfter(text: string, labels: string[]): string | undefined {
  const label = labels.join("|");
  return new RegExp(`(?:${label})\\s*(?:is|number|name)?\\s*[:,-]?\\s*(.+?)(?=\\s+(?:${FIELD_LABELS})\\b|$)`, "i")
    .exec(text)?.[1]?.trim().replace(/[.,;]+$/g, "");
}

function applyName(result: Partial<GateEntryDraft>, driver: string | undefined): void {
  const nameParts = driver?.split(/\s+/).filter(Boolean) ?? [];
  if (!nameParts.length) return;
  result.firstName = nameParts[0];
  if (nameParts.length > 1) result.lastName = nameParts.slice(1).join(" ");
}

function implicitDriver(text: string): string | undefined {
  const withoutAction = text.replace(CHECK_OUT, " ").replace(CHECK_IN, " ").trim();
  const withoutLead = withoutAction.replace(/^(?:please\s+)?(?:the\s+)?(?:visitor\s+)?/i, "");
  const cutoff = withoutLead.search(/\b(?:from|with|company|license\s+plate|plate|tag|truck|vehicle|purpose|reason|here\s+for|for|here\s+to|duration|time)\b/i);
  const candidate = (cutoff >= 0 ? withoutLead.slice(0, cutoff) : withoutLead)
    .replace(/^(?:driver|name)\s+/i, "")
    .trim()
    .replace(/[.,;]+$/g, "");
  if (!candidate || !/^[\p{L}][\p{L}'-]*(?:\s+[\p{L}][\p{L}'-]*){0,3}$/u.test(candidate)) return undefined;
  return candidate;
}

export function parseGateVoiceEntry(transcript: string): Partial<GateEntryDraft> {
  const text = transcript.trim();
  const plate = valueAfter(text, ["license plate", "plate", "tag"]);
  const driver = valueAfter(text, ["driver name", "driver", "name"]);
  const company = valueAfter(text, ["company", "from", "with"]);
  const purpose = valueAfter(text, ["purpose", "reason", "here for", "for", "here to"]);
  const duration = valueAfter(text, ["duration", "time"]);
  const result: Partial<GateEntryDraft> = {};
  const plateState = parseSpokenPlateState(text);
  if (plateState) result.plateState = plateState;
  if (plate) result.vehiclePlate = plate.replace(/\s+/g, "").toUpperCase();
  applyName(result, driver);
  if (company) result.company = company;
  if (purpose) result.purpose = purpose;
  const minutes = duration?.match(/\d+/)?.[0];
  if (minutes) result.expectedDuration = minutes;
  return result;
}

export function parseGateVoiceCommand(transcript: string): GateVoiceCommand {
  const intent: GateVoiceIntent = CHECK_OUT.test(transcript) ? "check-out" : CHECK_IN.test(transcript) ? "check-in" : "fill";
  const fill = parseGateVoiceEntry(transcript);
  if (!fill.firstName && !fill.lastName) applyName(fill, implicitDriver(transcript));
  return { intent, fill };
}

function normalize(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

function normalizePlate(value: string | null | undefined): string {
  return (value ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function matchGateCheckoutVisits<T extends GateCheckoutVisit>(visits: T[], fill: Partial<GateEntryDraft>): T[] {
  const plate = normalizePlate(fill.vehiclePlate);
  const firstName = normalize(fill.firstName);
  const lastName = normalize(fill.lastName);
  if (!plate && !firstName && !lastName) return [];
  return [...visits]
    .filter((visit) => {
      if (plate && normalizePlate(visit.vehiclePlate) !== plate) return false;
      if (firstName && normalize(visit.firstName) !== firstName) return false;
      if (lastName && normalize(visit.lastName) !== lastName) return false;
      return true;
    })
    .sort((a, b) => Date.parse(b.checkInTime) - Date.parse(a.checkInTime));
}
