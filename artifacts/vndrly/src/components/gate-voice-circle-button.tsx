import BrandedCircleChrome from "@/components/branded-circle-chrome";
import voiceBack from "@assets/white-circle-voice-back.png";
import voiceOverlay from "@assets/white-circle-voice-overlay.png";
import { cn } from "@/lib/utils";

interface GateVoiceCircleButtonProps {
  label: string;
  onClick: () => void;
  active?: boolean;
  testId?: string;
}

export default function GateVoiceCircleButton({
  label,
  onClick,
  active = false,
  testId,
}: GateVoiceCircleButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      data-state={active ? "listening" : "idle"}
      data-testid={testId}
      onClick={onClick}
      className="group flex h-32 w-32 cursor-pointer flex-col items-center justify-center gap-1 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
    >
      <BrandedCircleChrome
        backgroundMaskSrc={voiceBack}
        overlaySrc={voiceOverlay}
        size={104}
        className={cn(
          active && "rounded-full ring-4 ring-[color:var(--brand-primary)] ring-offset-2 ring-offset-transparent animate-pulse motion-reduce:animate-none",
        )}
        testIdPrefix="gate-voice"
      />
      <span className="text-xs font-semibold text-sidebar-foreground drop-shadow-[0_1px_2px_rgba(0,0,0,0.55)]">
        {label}
      </span>
    </button>
  );
}
