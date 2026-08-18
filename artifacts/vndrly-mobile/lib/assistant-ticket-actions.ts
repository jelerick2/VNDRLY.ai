export type TicketAskVAction = {
  key: "eta" | "route" | "mileage" | "gps" | "proof";
  labelKey: string;
  icon: "navigation" | "map" | "activity" | "crosshair" | "file-text";
  prompt: string;
};

export function askVActionsForTicket(ticketId: number): TicketAskVAction[] {
  return [
    {
      key: "eta",
      labelKey: "tickets.askvActions.eta",
      icon: "navigation",
      prompt: `Using my current location, what is my ETA and driving distance to ticket #${ticketId}?`,
    },
    {
      key: "route",
      labelKey: "tickets.askvActions.route",
      icon: "map",
      prompt: `Using my current location, show me the driving route and road miles to ticket #${ticketId}.`,
    },
    {
      key: "mileage",
      labelKey: "tickets.askvActions.mileage",
      icon: "activity",
      prompt: `Compare logged miles to expected road miles for ticket #${ticketId}. Use my current location if it helps.`,
    },
    {
      key: "gps",
      labelKey: "tickets.askvActions.gps",
      icon: "crosshair",
      prompt: `Summarize the GPS trail and site location history for ticket #${ticketId}.`,
    },
    {
      key: "proof",
      labelKey: "tickets.askvActions.proof",
      icon: "file-text",
      prompt: `Check proof-to-pay readiness for ticket #${ticketId}. Tell me what evidence is complete and what is missing before this ticket can be invoiced, paid, or defended.`,
    },
  ];
}

export function askVPromptRoute(prompt: string): string {
  return `/(tabs)/askv?prompt=${encodeURIComponent(prompt)}`;
}

export function readInitialAskVPromptParam(raw: unknown): string | null {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}
