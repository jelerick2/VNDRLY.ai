export type AssignedGateSite = {
  id: number;
  name: string;
  address: string;
  siteCode: string;
  latitude: number;
  longitude: number;
  assignmentId: number;
};

export type AssignedGateSitesResponse = {
  sites: AssignedGateSite[];
  defaultSite: AssignedGateSite | null;
};

export type GateSiteContextLike = {
  site: {
    id: number;
    name: string;
    address: string;
    siteCode: string;
    latitude: number;
    longitude: number;
  };
  vendors: { id: number }[];
};

/** Same current-location default the web gate booth uses. */
export const FLYWHEEL_SPUR_SITE_CODE = "SITE-B40D77D2";

export function shouldApplyDefaultGateSite(input: {
  confirmedCode: string | null;
  typedCode: string;
  defaultSiteCode: string | null | undefined;
}): boolean {
  if (input.confirmedCode) return false;
  if (input.typedCode.trim().length > 0) return false;
  return Boolean(input.defaultSiteCode);
}

export function pickDefaultGateHostKey(
  hosts: { key: string; type: string }[],
): string {
  return hosts.find((host) => host.type === "partner")?.key ?? hosts[0]?.key ?? "";
}

export function pickPreferredGateDefaultSite(
  sites: AssignedGateSite[],
  apiDefault: AssignedGateSite | null,
): AssignedGateSite | null {
  return sites.find((site) => site.siteCode === FLYWHEEL_SPUR_SITE_CODE) ?? apiDefault ?? null;
}

export async function resolveAssignedGateSites(input: {
  vendorId: number | null;
  listAssigned: () => Promise<AssignedGateSitesResponse>;
  getSiteContext: (siteCode: string) => Promise<GateSiteContextLike>;
  fallbackSiteCode?: string;
}): Promise<AssignedGateSitesResponse> {
  try {
    return await input.listAssigned();
  } catch {
    const code = input.fallbackSiteCode ?? FLYWHEEL_SPUR_SITE_CODE;
    try {
      const ctx = await input.getSiteContext(code);
      if (input.vendorId != null && !ctx.vendors.some((vendor) => vendor.id === input.vendorId)) {
        return { sites: [], defaultSite: null };
      }
      const site: AssignedGateSite = {
        id: ctx.site.id,
        name: ctx.site.name,
        address: ctx.site.address,
        siteCode: ctx.site.siteCode,
        latitude: ctx.site.latitude,
        longitude: ctx.site.longitude,
        assignmentId: ctx.site.id,
      };
      return { sites: [site], defaultSite: site };
    } catch {
      return { sites: [], defaultSite: null };
    }
  }
}
