export type NavItem<TIcon = unknown> = {
  href: string;
  label: string;
  key: string;
  icon: TIcon;
};

export type GateLogViewer = {
  role: string;
  vendorRole?: string | null;
};

export function canViewGateLog(user: GateLogViewer | null | undefined): boolean {
  if (!user) return false;
  if (user.role === "admin" || user.role === "partner") return true;
  if (user.role !== "vendor") return false;
  const role = user.vendorRole;
  return role == null || role === "office" || role === "both";
}

export function gateLogNavAnchorKey(items: Array<Pick<NavItem, "key">>): string {
  if (items.some((item) => item.key === "crew-map")) return "crew-map";
  if (items.some((item) => item.key === "site-map")) return "site-map";
  return "tracking";
}

export function withGateLogNav<TIcon>(
  items: Array<NavItem<TIcon>>,
  opts: {
    user: GateLogViewer | null | undefined;
    gatekeepingEnabled: boolean;
    label: string;
    icon: TIcon;
  },
): Array<NavItem<TIcon>> {
  if (!canViewGateLog(opts.user) || !opts.gatekeepingEnabled) return items;
  const item: NavItem<TIcon> = {
    href: "/gate-log",
    label: opts.label,
    key: "gate-log",
    icon: opts.icon,
  };
  const afterKey = gateLogNavAnchorKey(items);
  const idx = items.findIndex((row) => row.key === afterKey);
  if (idx === -1) return [...items, item];
  return [...items.slice(0, idx + 1), item, ...items.slice(idx + 1)];
}
