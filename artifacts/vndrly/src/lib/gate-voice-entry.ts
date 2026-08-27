import type { GateEntryDraft } from "@/lib/gate-entry-memory";
import { normalizePlateState, US_PLATE_STATES } from "@workspace/plate-state";

const SPOKEN_STATE_PATTERN = US_PLATE_STATES
  .flatMap((state) => [state.name, state.code])
  .sort((a, b) => b.length - a.length)
  .map((value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
  .join("|");

function plateStateBeforeLabel(text: string) {
  const spoken = new RegExp(
    `(?:^|\\s)(${SPOKEN_STATE_PATTERN})\\s+(?=(?:license plate|plate|tag)\\b)`,
    "i",
  ).exec(text)?.[1];
  return normalizePlateState(spoken);
}

export function parseGateVoiceEntry(transcript: string): Partial<GateEntryDraft> {
  const text = transcript.trim();
  const valueAfter = (labels: string[], stops: string[]) => {
    const label = labels.join("|");
    const stop = stops.join("|");
    return new RegExp(`(?:${label})\\s*(?:is|number|name)?\\s*[:,-]?\\s*(.+?)(?=\\s+(?:${stop})\\b|$)`, "i")
      .exec(text)?.[1]?.trim();
  };
  const allLabels = "license plate|plate|tag|driver|driver name|name|company|truck|vehicle|purpose|reason|duration|time";
  const plate = valueAfter(["license plate", "plate", "tag"], [allLabels]);
  const driver = valueAfter(["driver name", "driver", "name"], [allLabels]);
  const company = valueAfter(["company"], [allLabels]);
  const purpose = valueAfter(["purpose", "reason"], [allLabels]);
  const duration = valueAfter(["duration", "time"], [allLabels]);
  const nameParts = driver?.split(/\s+/).filter(Boolean) ?? [];
  const result: Partial<GateEntryDraft> = {};
  const plateState = plateStateBeforeLabel(text);
  if (plateState) result.plateState = plateState;
  if (plate) result.vehiclePlate = plate.replace(/\s+/g, "").toUpperCase();
  if (nameParts.length) {
    result.firstName = nameParts[0];
    if (nameParts.length > 1) result.lastName = nameParts.slice(1).join(" ");
  }
  if (company) result.company = company;
  if (purpose) result.purpose = purpose;
  const minutes = duration?.match(/\d+/)?.[0];
  if (minutes) result.expectedDuration = minutes;
  return result;
}
