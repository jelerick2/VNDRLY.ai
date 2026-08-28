import { describe, expect, it } from "vitest";
import { ClipboardList, Map, Ticket, UserPlus, type LucideIcon } from "lucide-react";
import {
  canViewGateLog,
  gateLogNavAnchorKey,
  withGateLogNav,
  type NavItem,
} from "./gate-ops-nav";

const crew: NavItem<LucideIcon> = { href: "/crew-map", label: "Crew Map", key: "crew-map", icon: Map };
const site: NavItem<LucideIcon> = { href: "/site-map", label: "Site Map", key: "site-map", icon: Map };
const visitors: NavItem<LucideIcon> = { href: "/visitors", label: "Visitors", key: "visitors", icon: UserPlus };
const tracking: NavItem<LucideIcon> = { href: "/tickets", label: "Tracking", key: "tracking", icon: Ticket };

describe("canViewGateLog", () => {
  it("is for admin and partner office viewers, not field or booth operators", () => {
    expect(canViewGateLog({ role: "admin" })).toBe(true);
    expect(canViewGateLog({ role: "partner" })).toBe(true);
    expect(canViewGateLog({ role: "vendor", vendorRole: "office" })).toBe(true);
    expect(canViewGateLog({ role: "vendor", vendorRole: "both" })).toBe(true);
    expect(canViewGateLog({ role: "vendor", vendorRole: null })).toBe(true);
    expect(canViewGateLog({ role: "vendor", vendorRole: "gatekeeper" })).toBe(false);
    expect(canViewGateLog({ role: "vendor", vendorRole: "field" })).toBe(false);
    expect(canViewGateLog({ role: "vendor", vendorRole: "foreman" })).toBe(false);
    expect(canViewGateLog({ role: "field_employee" })).toBe(false);
    expect(canViewGateLog(null)).toBe(false);
  });
});

describe("withGateLogNav", () => {
  it("inserts Gate Log directly under Crew Map when the company does gatekeeping", () => {
    const items = withGateLogNav([tracking, crew, visitors], {
      user: { role: "vendor", vendorRole: "office" },
      gatekeepingEnabled: true,
      label: "Gate Log",
      icon: ClipboardList,
    });
    const insertedIcon: LucideIcon = items[2].icon;
    expect(items.map((i) => i.key)).toEqual(["tracking", "crew-map", "gate-log", "visitors"]);
    expect(insertedIcon).toBe(ClipboardList);
  });

  it("inserts Gate Log under Site Map for partners who have no Crew Map", () => {
    expect(gateLogNavAnchorKey([tracking, site, visitors])).toBe("site-map");
    const items = withGateLogNav([tracking, site, visitors], {
      user: { role: "partner" },
      gatekeepingEnabled: true,
      label: "Gate Log",
      icon: ClipboardList,
    });
    expect(items.map((i) => i.key)).toEqual(["tracking", "site-map", "gate-log", "visitors"]);
  });

  it("hides the item when the company does not staff a gate", () => {
    const items = withGateLogNav([tracking, crew, visitors], {
      user: { role: "admin" },
      gatekeepingEnabled: false,
      label: "Gate Log",
      icon: ClipboardList,
    });
    expect(items.map((i) => i.key)).toEqual(["tracking", "crew-map", "visitors"]);
  });
});
