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

/** Legacy fixture value retained for compatibility tests; runtime defaults come only from assigned-sites. */
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

export async function resolveAssignedGateSites(input: {
  vendorId: number | null;
  listAssigned: () => Promise<AssignedGateSitesResponse>;
  getSiteContext: (siteCode: string) => Promise<GateSiteContextLike>;
  fallbackSiteCode?: string;
}): Promise<AssignedGateSitesResponse> {
  try { return await input.listAssigned(); }
  catch { return { sites: [], defaultSite: null }; }
}
