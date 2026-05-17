import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import PillBg from "@/components/pill-bg";
import {
  ticketStatusMeta,
  type TicketStatusBadgeColor,
} from "@/lib/ticket-status-meta";
import amberPill from "@assets/900x229_Amber_Pill_v4_1778504507024.png";
import bluePill from "@assets/900x229_Blue_Pill_1777099484818.png";
import greenPill from "@assets/900x229_Green_Pill_1777099484825.png";
import redPill from "@assets/900x229_red_Pill_v2_1777847855327.png";
import pillBase from "@assets/Vndrly_900x229_Light_Grey_Pill1_1777664658767.png";
import pillGloss from "@assets/900x229_overlay_v2_1777664185377.png";

const PILL_ASPECT = 900 / 229;
const INACTIVE_DAYS = 7;

const pillSrc: Record<TicketStatusBadgeColor, { src: string; light?: boolean }> = {
  amber: { src: amberPill },
  blue:  { src: bluePill },
  green: { src: greenPill },
  red:   { src: redPill },
  grey:  { src: pillBase, light: true },
};

interface TicketStatusBadgeProps {
  status: string;
  updatedAt?: string | Date | null;
  className?: string;
}

function isInactive(updatedAt?: string | Date | null): boolean {
  if (!updatedAt) return false;
  const updated = new Date(updatedAt);
  const now = new Date();
  const diffMs = now.getTime() - updated.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return diffDays >= INACTIVE_DAYS;
}

export default function TicketStatusBadge({ status, updatedAt, className }: TicketStatusBadgeProps) {
  const { t } = useTranslation();
  const meta = ticketStatusMeta[status];
  const label = meta ? t(meta.badgeLabelKey) : status;
  let color: TicketStatusBadgeColor | null = meta?.badgeColor ?? null;

  if (color && isInactive(updatedAt) && (status === "in_progress" || status === "draft" || status === "pending_review" || status === "kicked_back")) {
    color = "amber";
  }

  if (color == null && (status === "draft" || status === "pending_review") && isInactive(updatedAt)) {
    color = "amber";
  }

  if (color == null) {
    return (
      <span className={cn("text-xs text-muted-foreground font-medium", className)}>
        {label}
      </span>
    );
  }

  const cfg = pillSrc[color];

  return (
    <span
      className={cn(
        "group relative inline-flex items-center h-[24px] min-w-[98px] select-none pointer-events-none align-middle",
        className,
      )}
    >
      <PillBg
        src={cfg.src}
        imageAspect={PILL_ASPECT}
        className="opacity-90 group-hover:opacity-100 transition-opacity"
      />
      <PillBg src={pillGloss} stretch className="opacity-60" />
      <span
        className={cn(
          "relative z-10 flex items-center justify-center w-full h-full px-3 text-xs font-bold whitespace-nowrap",
          cfg.light ? "text-gray-700" : "text-white",
        )}
        style={cfg.light ? undefined : { textShadow: "0 2px 4px rgba(0,0,0,0.9)" }}
      >
        {label}
      </span>
    </span>
  );
}
