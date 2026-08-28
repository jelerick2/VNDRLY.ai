import { DEMO_USERS, type DemoMembership, type DemoUser } from "./demo-users";

export type DemoSeedOrgType = "partner" | "vendor";
export type DemoSeedMembershipRole = DemoMembership["role"];

export interface DemoSeedOrganizationInput {
  orgType: DemoSeedOrgType;
  name: string;
  contactName: string;
  contactEmail: string;
}

export interface DemoSeedOrganizationRow extends DemoSeedOrganizationInput {
  id: number;
}

export interface DemoSeedOrganizationSpec extends DemoSeedOrganizationInput {
  legacyOrgId: number;
  nameAliases: readonly string[];
  contactEmailAliases: readonly string[];
}

export interface DemoSeedUserInput {
  username: string;
  passwordHash: string;
  role: DemoUser["role"];
  displayName: string;
  preferredLanguage: "en" | "es" | "pt" | null;
}

export interface DemoSeedUserRow extends DemoSeedUserInput {
  id: number;
  email: string | null;
  activeMembershipId: number | null;
  mustChangePassword: boolean;
}

export interface DemoSeedMembershipInput {
  userId: number;
  orgType: DemoSeedOrgType;
  partnerId: number | null;
  vendorId: number | null;
  role: DemoSeedMembershipRole;
}

export interface DemoSeedMembershipRow extends DemoSeedMembershipInput {
  id: number;
}

/**
 * Minimal persistence seam for the dev demo-user recovery route. Keeping the
 * state machine independent of Drizzle lets the fail-safe/idempotence contract
 * run in unit tests without opening a PostgreSQL connection.
 */
export interface DemoSeedStore {
  listOrganizations(
    orgType: DemoSeedOrgType,
  ): Promise<DemoSeedOrganizationRow[]>;
  createOrganization(
    input: DemoSeedOrganizationInput,
  ): Promise<DemoSeedOrganizationRow | null>;
  listUsers(naturalIdentities: readonly string[]): Promise<DemoSeedUserRow[]>;
  createUser(input: DemoSeedUserInput): Promise<DemoSeedUserRow | null>;
  updateUserPassword(userId: number, passwordHash: string): Promise<void>;
  clearMustChangePassword(userId: number): Promise<void>;
  listMemberships(userId: number): Promise<DemoSeedMembershipRow[]>;
  createMembership(
    input: DemoSeedMembershipInput,
  ): Promise<DemoSeedMembershipRow | null>;
  setActiveMembership(userId: number, membershipId: number): Promise<void>;
}

export interface DemoSeedPasswordCodec {
  hash(password: string): string;
  compare(password: string, passwordHash: string): boolean;
}

export interface DemoSeedResult {
  added: string[];
  passwordReset: string[];
  organizationsAdded: string[];
  existingUserCount: number;
}

export interface ExistingDemoAccountRecovery {
  name: string;
  password: string;
  naturalIdentities: readonly string[];
}

/**
 * Canonical identities from docs/canonical-credentials.md. Matching is done
 * against LOWER(COALESCE(email, username)); these aliases intentionally stay
 * lowercase so the same comparison can be shared by runtime and tests.
 */
export const CANONICAL_DEMO_IDENTITIES = {
  admin: ["admin@vndrly.com", "admin"],
  baker: ["baker@vndrly.com", "baker"],
  winchester: ["winchester@vndrly.com", "winchester"],
  "joe.boggs@winchester.com": ["joe.boggs@winchester.com"],
  mach: ["mach@vndrly.com", "mach"],
  exxon: ["exxon@vndrly.com", "exxon"],
} as const;

/**
 * Canonical credentials that recover an account only when that natural
 * identity already exists. Joe Boggs belongs to the production/demo field
 * roster, not the dev account picker, so a clean `/auth/seed` must not invent
 * his user, organization, or membership rows.
 */
export const EXISTING_DEMO_ACCOUNT_RECOVERIES = [
  {
    name: "joe.boggs@winchester.com",
    password: "winchester2",
    naturalIdentities:
      CANONICAL_DEMO_IDENTITIES["joe.boggs@winchester.com"],
  },
] as const satisfies readonly ExistingDemoAccountRecovery[];

/**
 * Only organization rows required by DEMO_USERS memberships are represented.
 * Names line up with the Permian seed where one exists. Aliases cover known
 * legacy display-name variants without rewriting either row.
 */
export const DEMO_SEED_ORGANIZATIONS = [
  {
    orgType: "partner",
    legacyOrgId: 1,
    name: "ExxonMobil",
    nameAliases: ["Exxon Mobil"],
    contactName: "Demo Operations",
    contactEmail: "exxon@vndrly.com",
    contactEmailAliases: ["j.richardson@exxon.example.com"],
  },
  {
    orgType: "partner",
    legacyOrgId: 2,
    name: "Chevron",
    nameAliases: [],
    contactName: "Demo Operations",
    contactEmail: "chevron@vndrly.com",
    contactEmailAliases: ["s.mitchell@chevron.example.com"],
  },
  {
    orgType: "partner",
    legacyOrgId: 3,
    name: "Shell USA",
    nameAliases: ["Shell"],
    contactName: "Demo Operations",
    contactEmail: "shell@vndrly.com",
    contactEmailAliases: ["ops@shell.example.com"],
  },
  {
    orgType: "partner",
    legacyOrgId: 4,
    name: "Marathon Oil",
    nameAliases: ["Marathon"],
    contactName: "Demo Operations",
    contactEmail: "marathon@vndrly.com",
    contactEmailAliases: ["ops@marathon.example.com"],
  },
  {
    orgType: "partner",
    legacyOrgId: 6,
    name: "BP America (BPX Energy)",
    nameAliases: ["BP America", "BPX Energy", "BP"],
    contactName: "Demo Operations",
    contactEmail: "bp@vndrly.com",
    contactEmailAliases: ["ops@bp.example.com"],
  },
  {
    orgType: "partner",
    legacyOrgId: 19,
    name: "Mach Natural Resources",
    nameAliases: ["Mach Energy Holdings"],
    contactName: "Demo Operations",
    contactEmail: "mach@vndrly.com",
    contactEmailAliases: ["ops@machresources.example.com"],
  },
  {
    orgType: "vendor",
    legacyOrgId: 1,
    name: "Precision Drilling",
    nameAliases: [],
    contactName: "Demo Operations",
    contactEmail: "precision@vndrly.com",
    contactEmailAliases: [],
  },
  {
    orgType: "vendor",
    legacyOrgId: 2,
    name: "Baker Hughes",
    nameAliases: ["Baker Hughes Field Svcs", "Baker Hughes Field Services"],
    contactName: "Demo Operations",
    contactEmail: "baker@vndrly.com",
    contactEmailAliases: ["ops@bakerhughes.example.com"],
  },
  {
    orgType: "vendor",
    legacyOrgId: 3,
    name: "Winchester",
    nameAliases: ["Winchester Oilfield Services"],
    contactName: "Demo Operations",
    contactEmail: "winchester@vndrly.com",
    contactEmailAliases: [],
  },
] as const satisfies readonly DemoSeedOrganizationSpec[];

function normalizedNaturalName(value: string): string {
  return value.trim().toLowerCase();
}

function normalizedEmail(value: string): string {
  return value.trim().toLowerCase();
}

/** Mirrors SQL LOWER(COALESCE(email, username)) exactly (no fallback to the
 * username when a non-null email exists). */
export function demoUserNaturalIdentity(user: {
  email: string | null;
  username: string;
}): string {
  return (user.email ?? user.username).toLowerCase();
}

export function demoIdentityAliases(
  demo: Pick<DemoUser, "username">,
): string[] {
  const documented =
    CANONICAL_DEMO_IDENTITIES[
      demo.username as keyof typeof CANONICAL_DEMO_IDENTITIES
    ];
  return documented ? [...documented] : [demo.username.toLowerCase()];
}

export function demoPasswordRecoverySpecs(
  demoUsers: readonly DemoUser[] = DEMO_USERS,
): ExistingDemoAccountRecovery[] {
  return [
    ...demoUsers.map((demo) => ({
      name: demo.username,
      password: demo.password,
      naturalIdentities: demoIdentityAliases(demo),
    })),
    ...EXISTING_DEMO_ACCOUNT_RECOVERIES,
  ];
}

export function findDemoOrganization(
  rows: readonly DemoSeedOrganizationRow[],
  spec: DemoSeedOrganizationSpec,
): DemoSeedOrganizationRow | null {
  for (const candidate of [spec.name, ...spec.nameAliases]) {
    const normalizedCandidate = normalizedNaturalName(candidate);
    const match = rows.find(
      (row) => normalizedNaturalName(row.name) === normalizedCandidate,
    );
    if (match) return match;
  }

  const emails = new Set(
    [spec.contactEmail, ...spec.contactEmailAliases].map(normalizedEmail),
  );
  const emailMatches = rows.filter((row) =>
    emails.has(normalizedEmail(row.contactEmail)),
  );
  if (emailMatches.length > 1) {
    throw new Error(
      `Ambiguous ${spec.orgType} contact email for demo organization ${spec.name}`,
    );
  }
  return emailMatches[0] ?? null;
}

function rawDemoMemberships(demo: DemoUser): DemoMembership[] {
  if (demo.memberships && demo.memberships.length > 0) {
    return demo.memberships;
  }
  const role: DemoSeedMembershipRole =
    demo.role === "field_employee" ? "field_employee" : "admin";
  if (demo.partnerId) {
    return [{ orgType: "partner", orgId: demo.partnerId, role }];
  }
  if (demo.vendorId) {
    return [{ orgType: "vendor", orgId: demo.vendorId, role }];
  }
  return [];
}

function orgLookupKey(orgType: DemoSeedOrgType, legacyOrgId: number): string {
  return `${orgType}:${legacyOrgId}`;
}

function organizationSpecForMembership(
  membership: DemoMembership,
): DemoSeedOrganizationSpec {
  const spec = DEMO_SEED_ORGANIZATIONS.find(
    (candidate) =>
      candidate.orgType === membership.orgType &&
      candidate.legacyOrgId === membership.orgId,
  );
  if (!spec) {
    throw new Error(
      `No natural-key organization mapping for ${membership.orgType} ${membership.orgId}`,
    );
  }
  return spec;
}

async function ensureOrganization(
  store: DemoSeedStore,
  spec: DemoSeedOrganizationSpec,
): Promise<{ row: DemoSeedOrganizationRow; created: boolean }> {
  let rows = await store.listOrganizations(spec.orgType);
  const existing = findDemoOrganization(rows, spec);
  if (existing) return { row: existing, created: false };

  const created = await store.createOrganization({
    orgType: spec.orgType,
    name: spec.name,
    contactName: spec.contactName,
    contactEmail: spec.contactEmail,
  });
  if (created) return { row: created, created: true };

  // A concurrent seed may have won the unique-name race. Re-resolve by the
  // same natural keys; never guess an id and never overwrite the winner.
  rows = await store.listOrganizations(spec.orgType);
  const concurrent = findDemoOrganization(rows, spec);
  if (!concurrent) {
    throw new Error(`Could not resolve demo organization ${spec.name}`);
  }
  return { row: concurrent, created: false };
}

async function ensureMemberships(
  store: DemoSeedStore,
  user: DemoSeedUserRow,
  demo: DemoUser,
  resolvedOrgIds: ReadonlyMap<string, number>,
): Promise<void> {
  let memberships = await store.listMemberships(user.id);
  for (const desired of rawDemoMemberships(demo)) {
    const orgId = resolvedOrgIds.get(
      orgLookupKey(desired.orgType, desired.orgId),
    );
    if (orgId === undefined) {
      throw new Error(
        `Demo organization was not resolved for ${desired.orgType} ${desired.orgId}`,
      );
    }
    const existing = memberships.find((row) =>
      desired.orgType === "partner"
        ? row.orgType === "partner" && row.partnerId === orgId
        : row.orgType === "vendor" && row.vendorId === orgId,
    );
    if (existing) continue;

    const created = await store.createMembership({
      userId: user.id,
      orgType: desired.orgType,
      partnerId: desired.orgType === "partner" ? orgId : null,
      vendorId: desired.orgType === "vendor" ? orgId : null,
      role: desired.role,
    });
    if (created) memberships.push(created);
  }

  // Preserve every existing active choice. We only fill the null field when
  // there is exactly one membership, matching the existing route behavior
  // for a newly created single-org user without rewriting session state.
  memberships = await store.listMemberships(user.id);
  if (memberships.length === 1 && user.activeMembershipId === null) {
    await store.setActiveMembership(user.id, memberships[0].id);
    user.activeMembershipId = memberships[0].id;
  }
}

/**
 * Additively synchronizes the dev demo users and only the organization rows
 * their memberships require. No delete exists in this persistence contract;
 * existing organization/user/membership rows are never rewritten except for
 * canonical demo password recovery, clearing mustChangePassword, and filling
 * a null activeMembershipId for a single-membership user.
 */
export async function syncDemoUsers(
  store: DemoSeedStore,
  passwords: DemoSeedPasswordCodec,
  demoUsers: readonly DemoUser[] = DEMO_USERS,
): Promise<DemoSeedResult> {
  const recoverySpecs = demoPasswordRecoverySpecs(demoUsers);
  const naturalIdentities = [
    ...new Set(recoverySpecs.flatMap((recovery) => recovery.naturalIdentities)),
  ];
  const initialUsers = await store.listUsers(naturalIdentities);
  let knownUsers = [...initialUsers];
  const added: string[] = [];
  const passwordReset = new Set<string>();
  const organizationsAdded: string[] = [];
  const resolvedOrgIds = new Map<string, number>();

  const requiredOrgKeys = new Set<string>();
  for (const demo of demoUsers) {
    for (const membership of rawDemoMemberships(demo)) {
      const spec = organizationSpecForMembership(membership);
      requiredOrgKeys.add(orgLookupKey(spec.orgType, spec.legacyOrgId));
    }
  }

  // Use the declared organization order rather than DEMO_USERS order. This is
  // still ID-agnostic, but keeps clean-schema insertion deterministic for
  // older fixtures while every membership uses the returned database id.
  for (const spec of DEMO_SEED_ORGANIZATIONS) {
    const key = orgLookupKey(spec.orgType, spec.legacyOrgId);
    if (!requiredOrgKeys.has(key)) continue;
    const ensured = await ensureOrganization(store, spec);
    resolvedOrgIds.set(key, ensured.row.id);
    if (ensured.created) organizationsAdded.push(spec.name);
  }

  for (const demo of demoUsers) {
    const aliases = new Set(demoIdentityAliases(demo));
    let matches = knownUsers.filter((row) =>
      aliases.has(demoUserNaturalIdentity(row)),
    );

    if (matches.length === 0) {
      const created = await store.createUser({
        username: demo.username,
        passwordHash: passwords.hash(demo.password),
        role: demo.role,
        displayName: demo.displayName,
        preferredLanguage:
          demo.preferredLanguage === "en" || demo.preferredLanguage === "es"
            ? demo.preferredLanguage
            : null,
      });
      if (created) {
        knownUsers.push(created);
        matches = [created];
        added.push(demo.username);
      } else {
        // A concurrent request may have inserted the username. Re-read and
        // accept it only when LOWER(COALESCE(email, username)) is canonical.
        knownUsers = await store.listUsers(naturalIdentities);
        matches = knownUsers.filter((row) =>
          aliases.has(demoUserNaturalIdentity(row)),
        );
        if (matches.length === 0) {
          throw new Error(
            `Demo username ${demo.username} exists with a non-canonical identity`,
          );
        }
      }
    }

    // There may intentionally be more than one documented alias row (for
    // example admin and admin@vndrly.com). Restore and provision each match.
    for (const user of matches) {
      if (!passwords.compare(demo.password, user.passwordHash)) {
        await store.updateUserPassword(user.id, passwords.hash(demo.password));
        passwordReset.add(demo.username);
      } else if (user.mustChangePassword) {
        await store.clearMustChangePassword(user.id);
      }
      await ensureMemberships(store, user, demo, resolvedOrgIds);
    }
  }

  // Recovery-only identities are intentionally processed after the seeded
  // demo accounts. Never create a missing row, infer a membership, rewrite an
  // active context, or bump sessionVersion; only restore the documented hash
  // on an existing natural-identity match.
  for (const recovery of EXISTING_DEMO_ACCOUNT_RECOVERIES) {
    const aliases = new Set<string>(recovery.naturalIdentities);
    const matches = knownUsers.filter((row) =>
      aliases.has(demoUserNaturalIdentity(row)),
    );
    for (const user of matches) {
      if (!passwords.compare(recovery.password, user.passwordHash)) {
        await store.updateUserPassword(
          user.id,
          passwords.hash(recovery.password),
        );
        passwordReset.add(recovery.name);
      } else if (user.mustChangePassword) {
        await store.clearMustChangePassword(user.id);
      }
    }
  }

  return {
    added,
    passwordReset: [...passwordReset],
    organizationsAdded,
    existingUserCount: initialUsers.length,
  };
}
