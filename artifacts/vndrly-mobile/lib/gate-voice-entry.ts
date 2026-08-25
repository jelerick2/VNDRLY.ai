export type GateVoiceFill = {
  firstName?: string;
  lastName?: string;
  company?: string;
  vehiclePlate?: string;
  purpose?: string;
  duration?: string;
};

export function parseGateVoiceEntry(transcript: string): GateVoiceFill {
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
  return {
    ...(plate ? { vehiclePlate: plate.replace(/\s+/g, "").toUpperCase() } : {}),
    ...(nameParts[0] ? { firstName: nameParts[0] } : {}),
    ...(nameParts.length > 1 ? { lastName: nameParts.slice(1).join(" ") } : {}),
    ...(company ? { company } : {}),
    ...(purpose ? { purpose } : {}),
    ...(duration?.match(/\d+/)?.[0] ? { duration: duration.match(/\d+/)![0] } : {}),
  };
}
