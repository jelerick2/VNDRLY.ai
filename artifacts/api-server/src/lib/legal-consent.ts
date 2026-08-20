export const LEGAL_POLICY_VERSION = "2026-08-20";

export function isLegalConsentPayloadAccepted(
  payload: Record<string, unknown>,
): boolean {
  const legal = (payload.legalConsent ?? {}) as Record<string, unknown>;
  if (legal.accepted !== true) return false;
  const version = typeof legal.version === "string" ? legal.version.trim() : "";
  return version === LEGAL_POLICY_VERSION;
}
