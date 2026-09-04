import React from "react";
import { Text } from "react-native";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { AppNavigationItem } from "@/lib/app-navigation";
import AdaptiveNavigationShell from "./AdaptiveNavigationShell";

vi.mock("@expo/vector-icons", () => ({
  Feather: ({ name }: { name: string }) => <Text>{name}</Text>,
}));
vi.mock("@/hooks/use-brand", () => ({
  useBrand: () => ({ name: "VNDRLY", primary: "#FFB800" }),
}));
vi.mock("@/hooks/useColors", () => ({
  useColors: () => ({ primary: "#FFB800", mutedForeground: "#a3a3a3" }),
}));
vi.mock("@/components/BrandTitleRow", () => ({
  default: () => <Text>VNDRLY</Text>,
}));
vi.mock("@/components/AskVNavLogo", () => ({
  default: () => <Text>AskV art</Text>,
}));
vi.mock("@/components/GateVoiceNavButton", () => ({
  default: ({ onPress, testID }: { onPress: () => void; testID: string }) => (
    <Text onPress={onPress} testID={testID}>
      Voice art
    </Text>
  ),
}));

afterEach(cleanup);

const items: AppNavigationItem[] = [
  {
    key: "gate",
    href: "/gate",
    icon: "truck",
    kind: "standard",
    label: "Gate",
  },
  { key: "askv", href: "/askv", icon: "zap", kind: "askv", label: "AskV" },
  {
    key: "gate-voice",
    href: "/gate",
    icon: "mic",
    kind: "gate-voice",
    label: "Voice",
  },
  {
    key: "gate-history",
    href: "/history",
    icon: "clock",
    kind: "standard",
    label: "History",
  },
  {
    key: "profile",
    href: "/profile",
    icon: "user",
    kind: "standard",
    label: "Profile",
  },
];

describe("AdaptiveNavigationShell", () => {
  it("uses bottom navigation below 768 points and keeps Voice centered", () => {
    const onActivate = vi.fn();
    const screen = render(
      <AdaptiveNavigationShell
        activeKey="gate"
        bottomInset={0}
        gateVoiceActive={false}
        items={items}
        onActivate={onActivate}
        width={390}
      >
        <Text>Content</Text>
      </AdaptiveNavigationShell>,
    );
    expect(screen.getByTestId("adaptive-bottom-tray")).toBeTruthy();
    expect(screen.queryByTestId("adaptive-sidebar")).toBeNull();
    const tray = screen.getByTestId("adaptive-bottom-tray");
    expect(
      Array.from(tray.children).map((node) => node.getAttribute("data-testid")),
    ).toEqual([
      "nav-gate",
      "nav-askv",
      "nav-gate-voice-container",
      "nav-gate-history",
      "nav-profile",
    ]);
    fireEvent.click(screen.getByText("Voice art"));
    expect(onActivate).toHaveBeenCalledWith(items[2]);
  });

  it("uses a persistent sidebar at 768 points and above", () => {
    const screen = render(
      <AdaptiveNavigationShell
        activeKey="gate"
        bottomInset={0}
        gateVoiceActive={false}
        items={items}
        onActivate={() => undefined}
        width={1024}
      >
        <Text>Content</Text>
      </AdaptiveNavigationShell>,
    );
    expect(screen.getByTestId("adaptive-sidebar")).toBeTruthy();
    expect(screen.queryByTestId("adaptive-bottom-tray")).toBeNull();
    expect(screen.getByTestId("adaptive-navigation-content")).toBeTruthy();
  });
});
