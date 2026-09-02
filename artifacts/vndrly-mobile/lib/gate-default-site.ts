export type AssignedGateSite = {
  id: number;
  name: string;
  address: string;
  siteCode: string;
  latitude: number;
  longitude: number;
  assignmentId: number;
  partnerId: number;
  partnerName: string;
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

export function pickPreferredGateDefaultSite(
  sites: AssignedGateSite[],
  apiDefault: AssignedGateSite | null,
): AssignedGateSite | null {
  return apiDefault && sites.some((site) => site.id === apiDefault.id) ? apiDefault : sites[0] ?? null;
}

export type GateCoordinates = { latitude: number; longitude: number };

function distanceSquared(a: GateCoordinates, b: GateCoordinates): number {
  const latitudeScale = Math.cos(((a.latitude + b.latitude) / 2) * Math.PI / 180);
  const latitudeDelta = a.latitude - b.latitude;
  const longitudeDelta = (a.longitude - b.longitude) * latitudeScale;
  return latitudeDelta ** 2 + longitudeDelta ** 2;
}

export function pickNearestAssignedGateSite(
  sites: AssignedGateSite[],
  origin: GateCoordinates | null,
): AssignedGateSite | null {
  if (!origin || sites.length === 0) return null;
  return sites.reduce((nearest, site) =>
    distanceSquared(origin, site) < distanceSquared(origin, nearest) ? site : nearest,
  );
}

export type AssignedGatePartnerGroup = {
  partnerId: number;
  partnerName: string;
  sites: AssignedGateSite[];
};

export function groupAssignedGateSitesByPartner(
  sites: AssignedGateSite[],
): AssignedGatePartnerGroup[] {
  const groups = new Map<number, AssignedGatePartnerGroup>();
  for (const site of sites) {
    const group = groups.get(site.partnerId) ?? {
      partnerId: site.partnerId,
      partnerName: site.partnerName,
      sites: [],
    };
    group.sites.push(site);
    groups.set(site.partnerId, group);
  }
  return [...groups.values()]
    .map((group) => ({ ...group, sites: [...group.sites].sort((a, b) => a.name.localeCompare(b.name)) }))
    .sort((a, b) => a.partnerName.localeCompare(b.partnerName));
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
