import { type ReactNode } from "react";
import { History, Shield } from "lucide-react";
import { FieldOpsPortalShell, type FieldOpsTabDef } from "@/components/field-ops-portal-shell";

const TABS: FieldOpsTabDef[] = [
  {
    href: "/gate",
    icon: Shield,
    labelKey: "gateNav.gate",
    testId: "tab-gate-home",
    match: (p) => p === "/gate" || p === "/",
  },
  {
    href: "/gate/history",
    icon: History,
    labelKey: "gateNav.history",
    testId: "tab-gate-history",
    match: (p) => p === "/gate/history" || p.startsWith("/gate/history/"),
  },
];

export function GatePortalLayout({ children }: { children: ReactNode }) {
  return (
    <FieldOpsPortalShell
      tabs={TABS}
      portalLabelKey="gatekeeper.portal"
      navAriaKey="gateNav.aria"
    >
      {children}
    </FieldOpsPortalShell>
  );
}

export default GatePortalLayout;
