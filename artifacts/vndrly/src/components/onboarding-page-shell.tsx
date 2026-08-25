import { useState, type ReactNode } from "react";
import DarkLightToggle, {
  type ThemeMode,
} from "@/components/dark-light-toggle";
import LanguageToggle from "@/components/language-toggle";
import { NavPaneHalftoneBackground } from "@/components/nav-pane-halftone-background";
import { NAV_PANE_DARK_BG } from "@/components/nav-pane-tokens";
import { brandStyleVars, type Brand } from "@/hooks/use-brand";

interface OnboardingPageShellProps {
  brand: Brand;
  children: ReactNode;
}

/**
 * Shared VNDRLY visual shell for the partner and vendor onboarding wizards.
 * Keeps the public onboarding experience aligned with login, signup, and the
 * portal: steel/halftone navigation chrome, oilfield imagery, brand accent,
 * and the canonical language + dark/light controls.
 */
export function OnboardingPageShell({
  brand,
  children,
}: OnboardingPageShellProps): React.ReactElement {
  const [themeMode, setThemeMode] = useState<ThemeMode>("dark");
  const isDark = themeMode === "dark";

  return (
    <div
      className="min-h-screen relative overflow-x-hidden px-4 py-8 sm:px-6 sm:py-10"
      style={{
        ...brandStyleVars(brand),
        backgroundColor: isDark ? NAV_PANE_DARK_BG : "#f3f4f6",
      }}
      data-testid="onboarding-page-shell"
      data-theme={themeMode}
    >
      <img
        src="/vndrly-background.jpg"
        alt=""
        aria-hidden="true"
        className="fixed inset-0 h-full w-full object-cover pointer-events-none transition-opacity duration-300"
        style={{ opacity: isDark ? 0.24 : 0.1 }}
        draggable={false}
      />
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background: isDark
            ? "linear-gradient(135deg, rgba(34,37,42,0.96) 0%, rgba(58,61,66,0.86) 52%, rgba(17,24,39,0.78) 100%)"
            : "linear-gradient(135deg, rgba(255,255,255,0.94) 0%, rgba(243,244,246,0.88) 58%, rgba(229,231,235,0.82) 100%)",
        }}
      />
      <NavPaneHalftoneBackground enabled={isDark} variant="auth" />
      <div className="fixed inset-x-0 top-0 h-28 bg-gradient-to-b from-black/20 to-transparent pointer-events-none" />
      <div className="fixed inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/25 to-transparent pointer-events-none" />
      <div
        className="fixed inset-x-0 top-0 h-1 pointer-events-none"
        style={{ backgroundColor: "var(--brand-primary)" }}
      />

      <div className="fixed top-4 left-4 z-30">
        <DarkLightToggle
          mode={themeMode}
          onChange={setThemeMode}
          variant={isDark ? "dark" : "light"}
        />
      </div>
      <div className="fixed top-4 right-4 z-30">
        <LanguageToggle variant={isDark ? "dark" : "light"} />
      </div>

      <main className="relative z-10 mx-auto w-full max-w-4xl pt-10">
        {children}
      </main>
    </div>
  );
}
