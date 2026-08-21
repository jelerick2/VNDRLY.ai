export const ACTION_AUDIT_STATUSES = [
  "success",
  "requires_confirmation",
  "failed",
  "cancelled",
] as const;

export type ActionAuditStatus = (typeof ACTION_AUDIT_STATUSES)[number];

export type ActionAuditListSourceRow = {
  id: number;
  createdAt: Date | string;
  userId: number | null;
  userDisplayName: string | null;
  userEmail: string | null;
  actorRole: string | null;
  actorMembershipRole: string | null;
  partnerId: number | null;
  vendorId: number | null;
  vendorPeopleId: number | null;
  clientSurface: string;
  inputMode: string;
  provider: string;
  toolName: string;
  actionType: string;
  targetType: string | null;
  targetId: string | null;
  confirmationPhrase: string | null;
  gpsLatitude: number | null;
  gpsLongitude: number | null;
  gpsAccuracyMeters: number | null;
  resultStatus: string;
  errorCode: string | null;
  errorMessage: string | null;
  toolInput: unknown;
  toolOutput: unknown;
};

export type ActionAuditListRow = Omit<
  ActionAuditListSourceRow,
  | "createdAt"
  | "gpsLatitude"
  | "gpsLongitude"
  | "gpsAccuracyMeters"
  | "toolInput"
  | "toolOutput"
> & {
  createdAt: string;
  hasGps: boolean;
  hasToolInput: boolean;
  hasToolOutput: boolean;
};

export function clampActionAuditLimit(raw: unknown): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return 50;
  return Math.min(100, Math.max(1, Math.floor(n)));
}

export function normalizeActionAuditStatus(raw: unknown): ActionAuditStatus | null {
  if (typeof raw !== "string") return null;
  return ACTION_AUDIT_STATUSES.includes(raw as ActionAuditStatus)
    ? (raw as ActionAuditStatus)
    : null;
}

export function toActionAuditListRow(
  row: ActionAuditListSourceRow,
): ActionAuditListRow {
  const createdAt =
    row.createdAt instanceof Date
      ? row.createdAt.toISOString()
      : new Date(row.createdAt).toISOString();
  const hasGps =
    row.gpsLatitude !== null ||
    row.gpsLongitude !== null ||
    row.gpsAccuracyMeters !== null;

  return {
    id: row.id,
    createdAt,
    userId: row.userId,
    userDisplayName: row.userDisplayName,
    userEmail: row.userEmail,
    actorRole: row.actorRole,
    actorMembershipRole: row.actorMembershipRole,
    partnerId: row.partnerId,
    vendorId: row.vendorId,
    vendorPeopleId: row.vendorPeopleId,
    clientSurface: row.clientSurface,
    inputMode: row.inputMode,
    provider: row.provider,
    toolName: row.toolName,
    actionType: row.actionType,
    targetType: row.targetType,
    targetId: row.targetId,
    confirmationPhrase: row.confirmationPhrase,
    resultStatus: row.resultStatus,
    errorCode: row.errorCode,
    errorMessage: row.errorMessage,
    hasGps,
    hasToolInput: row.toolInput !== null && row.toolInput !== undefined,
    hasToolOutput: row.toolOutput !== null && row.toolOutput !== undefined,
  };
}
