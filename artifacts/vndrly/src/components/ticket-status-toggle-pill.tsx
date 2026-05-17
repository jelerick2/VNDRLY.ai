import { useTranslation } from "react-i18next";
import TogglePill, { type TogglePillColor } from "@/components/toggle-pill";
import {
  ticketStatusMeta,
  type TicketStatusBadgeColor,
} from "@/lib/ticket-status-meta";

const STATUS_PILL_COLOR: Record<
  Exclude<TicketStatusBadgeColor, "grey">,
  TogglePillColor
> = {
  amber: "amber",
  blue: "blue",
  green: "green",
  red: "red",
};

const INACTIVE_DAYS = 7;

function isInactive(updatedAt?: string | Date | null): boolean {
  if (!updatedAt) return false;
  const updated = new Date(updatedAt);
  const now = new Date();
  const diffMs = now.getTime() - updated.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return diffDays >= INACTIVE_DAYS;
}

interface TicketStatusTogglePillProps {
  status: string;
  updatedAt?: string | Date | null;
  className?: string;
  height?: number;
  "data-testid"?: string;
}

/**
 * Read-only ticket-status chip rendered in the canonical TogglePill
 * visual language, mirroring the Dashboard "Recent Activity" card.
 *
 * Color schema (driven by `ticketStatusMeta.badgeColor`):
 *   - approved / completed / funds_dispersed → green
 *   - initiated / in_progress               → blue
 *   - submitted / awaiting_payment / awaiting_acceptance → amber
 *   - kicked_back                           → red
 *   - pending_review / cancelled            → grey (rest chrome)
 *   - draft / denied (badgeColor null)      → plain muted text
 *
 * When `updatedAt` is provided and the row hasn't moved in 7+ days,
 * the chip re-colors to amber for `in_progress`, `draft`,
 * `pending_review`, and `kicked_back` — same staleness rule as the
 * legacy `TicketStatusBadge`, so swapping the two on the tracking
 * page preserves the office-attention signal.
 */
export default function TicketStatusTogglePill({
  status,
  updatedAt,
  className,
  height = 24,
  ...props
}: TicketStatusTogglePillProps) {
  const { t } = useTranslation();
  const meta = ticketStatusMeta[status];
  const label = meta ? t(meta.badgeLabelKey) : status;
  const testId =
    props["data-testid"] ?? `badge-status-${meta?.testIdStem ?? status}`;

  let color: TicketStatusBadgeColor | null = meta?.badgeColor ?? null;

  if (
    color &&
    isInactive(updatedAt) &&
    (status === "in_progress" ||
      status === "draft" ||
      status === "pending_review" ||
      status === "kicked_back")
  ) {
    color = "amber";
  }

  if (
    color == null &&
    (status === "draft" || status === "pending_review") &&
    isInactive(updatedAt)
  ) {
    color = "amber";
  }

  if (color == null) {
    return (
      <span
        className="text-xs text-muted-foreground font-medium"
        data-testid={testId}
      >
        {label}
      </span>
    );
  }

  if (color === "grey") {
    return (
      <TogglePill
        rest
        height={height}
        className={className ?? "min-w-[110px] align-middle"}
        data-testid={testId}
      >
        {label}
      </TogglePill>
    );
  }

  return (
    <TogglePill
      color={STATUS_PILL_COLOR[color]}
      height={height}
      className={className ?? "min-w-[110px] align-middle"}
      data-testid={testId}
    >
      {label}
    </TogglePill>
  );
}
