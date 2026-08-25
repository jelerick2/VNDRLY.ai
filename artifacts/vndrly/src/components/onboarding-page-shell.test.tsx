import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DEFAULT_BRAND } from "@/hooks/use-brand";
import { OnboardingPageShell } from "./onboarding-page-shell";

vi.mock("@/components/dark-light-toggle", () => ({
  default: ({
    mode,
    onChange,
  }: {
    mode: "dark" | "light";
    onChange: (mode: "dark" | "light") => void;
  }) => (
    <button
      type="button"
      data-testid="theme-toggle-mock"
      onClick={() => onChange(mode === "dark" ? "light" : "dark")}
    >
      {mode}
    </button>
  ),
}));

vi.mock("@/components/language-toggle", () => ({
  default: () => <div data-testid="language-toggle-mock" />,
}));

vi.mock("@/components/nav-pane-halftone-background", () => ({
  NavPaneHalftoneBackground: ({ enabled }: { enabled?: boolean }) =>
    enabled ? <div data-testid="halftone-mock" /> : null,
}));

describe("OnboardingPageShell", () => {
  it("uses the standard VNDRLY dark treatment and supports light mode", () => {
    render(
      <OnboardingPageShell brand={DEFAULT_BRAND}>
        <div>Wizard content</div>
      </OnboardingPageShell>,
    );

    const shell = screen.getByTestId("onboarding-page-shell");
    expect(shell.getAttribute("data-theme")).toBe("dark");
    expect(screen.getByTestId("halftone-mock")).toBeTruthy();
    expect(screen.getByTestId("language-toggle-mock")).toBeTruthy();
    expect(screen.getByText("Wizard content")).toBeTruthy();

    fireEvent.click(screen.getByTestId("theme-toggle-mock"));
    expect(shell.getAttribute("data-theme")).toBe("light");
    expect(screen.queryByTestId("halftone-mock")).toBeNull();
  });
});
