export type ProofPacketTicket = {
  status?: string | null;
  notes?: string | null;
  checkInTime?: string | Date | null;
  checkOutTime?: string | Date | null;
  checkInLatitude?: number | null;
  checkInLongitude?: number | null;
  checkOutLatitude?: number | null;
  checkOutLongitude?: number | null;
  siteLatitude?: number | null;
  siteLongitude?: number | null;
  siteRadiusMeters?: number | null;
  startingMileage?: string | number | null;
  endingMileage?: string | number | null;
  approvedAt?: string | Date | null;
  paymentDispersedAt?: string | Date | null;
  paymentReference?: string | null;
};

export type ProofPacketLineItem = {
  type?: string | null;
  quantity?: string | number | null;
  unitPrice?: string | number | null;
};

export type ProofPacketNoteEvidence = {
  content?: string | null;
  attachments?: readonly string[] | null;
};

export type ProofPacketSectionId =
  | "gps_time"
  | "field_notes"
  | "mileage"
  | "cost"
  | "approval"
  | "payment";

export type ProofPacketSection = {
  id: ProofPacketSectionId;
  label: string;
  complete: boolean;
  detail: string;
  missingLabel: string;
};

export type ProofPacketSummary = {
  status: "complete" | "needs_attention";
  completedCount: number;
  totalCount: number;
  sections: ProofPacketSection[];
  missingEvidence: string[];
  lineItemTotal: number;
};

function hasValue(value: unknown): boolean {
  return value !== null && value !== undefined && value !== "";
}

function hasCoordinate(latitude: unknown, longitude: unknown): boolean {
  return typeof latitude === "number" && Number.isFinite(latitude)
    && typeof longitude === "number" && Number.isFinite(longitude);
}

function numberFrom(value: string | number | null | undefined): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string" || !value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatMoney(amount: number): string {
  return amount.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}

function costTotal(lineItems: readonly ProofPacketLineItem[]): number {
  return lineItems.reduce((sum, item) => {
    const quantity = numberFrom(item.quantity);
    const unitPrice = numberFrom(item.unitPrice);
    if (quantity == null || unitPrice == null) return sum;
    return sum + quantity * unitPrice;
  }, 0);
}

export function buildTicketProofPacket(
  ticket: ProofPacketTicket,
  lineItems: readonly ProofPacketLineItem[] = [],
  noteEvidence: readonly ProofPacketNoteEvidence[] = [],
): ProofPacketSummary {
  const hasCheckInProof =
    hasValue(ticket.checkInTime) &&
    hasCoordinate(ticket.checkInLatitude, ticket.checkInLongitude);
  const hasCheckOutProof =
    hasValue(ticket.checkOutTime) &&
    hasCoordinate(ticket.checkOutLatitude, ticket.checkOutLongitude);
  const hasSiteProof = hasCoordinate(ticket.siteLatitude, ticket.siteLongitude);
  const gpsComplete = hasCheckInProof && hasCheckOutProof && hasSiteProof;
  const noteCount = noteEvidence.filter((note) => hasValue(note.content)).length;
  const attachmentCount = noteEvidence.reduce(
    (sum, note) => sum + (note.attachments?.length ?? 0),
    0,
  );
  const hasFieldNotes = hasValue(ticket.notes) || noteCount > 0 || attachmentCount > 0;

  const startingMileage = numberFrom(ticket.startingMileage);
  const endingMileage = numberFrom(ticket.endingMileage);
  const mileageDelta =
    startingMileage != null && endingMileage != null
      ? Math.max(0, endingMileage - startingMileage)
      : null;

  const lineItemTotal = costTotal(lineItems);
  const hasCostProof = lineItems.length > 0 && lineItemTotal > 0;
  const hasApprovalProof = hasValue(ticket.approvedAt);
  const hasPaymentProof =
    ticket.status === "funds_dispersed" ||
    hasValue(ticket.paymentDispersedAt) ||
    hasValue(ticket.paymentReference);

  const sections: ProofPacketSection[] = [
    {
      id: "gps_time",
      label: "GPS / Time",
      complete: gpsComplete,
      detail: gpsComplete
        ? "Check-in, check-out, and site coordinates captured"
        : "Needs check-in, check-out, and site coordinate evidence",
      missingLabel: hasCheckOutProof ? "GPS/time evidence" : "checkout GPS/time",
    },
    {
      id: "field_notes",
      label: "Field Notes / Attachments",
      complete: hasFieldNotes,
      detail: hasFieldNotes
        ? `${noteCount + (hasValue(ticket.notes) ? 1 : 0)} note source(s), ${attachmentCount} attachment(s)`
        : "Needs a note, photo, or document attachment",
      missingLabel: "field notes/photos",
    },
    {
      id: "mileage",
      label: "Mileage",
      complete: mileageDelta != null,
      detail: mileageDelta != null
        ? `${mileageDelta.toFixed(1)} mi logged`
        : "Needs starting and ending mileage",
      missingLabel: startingMileage == null ? "starting mileage" : "ending mileage",
    },
    {
      id: "cost",
      label: "Parts / Labor / Equipment",
      complete: hasCostProof,
      detail: hasCostProof ? `${formatMoney(lineItemTotal)} captured` : "Needs billable line items",
      missingLabel: "parts/labor/equipment line items",
    },
    {
      id: "approval",
      label: "Approval",
      complete: hasApprovalProof,
      detail: hasApprovalProof ? "Partner/admin approval recorded" : "Needs partner/admin approval",
      missingLabel: "partner/admin approval",
    },
    {
      id: "payment",
      label: "Payment",
      complete: hasPaymentProof,
      detail: hasPaymentProof ? "Payment record attached to ticket" : "Needs payment record",
      missingLabel: "payment record",
    },
  ];

  const missingEvidence = sections
    .filter((section) => !section.complete)
    .map((section) => section.missingLabel);
  const completedCount = sections.length - missingEvidence.length;

  return {
    status: missingEvidence.length === 0 ? "complete" : "needs_attention",
    completedCount,
    totalCount: sections.length,
    sections,
    missingEvidence,
    lineItemTotal,
  };
}
