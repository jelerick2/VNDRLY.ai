import { describe, expect, it } from "vitest";
import { DEMO_USERS } from "./demo-users";
import {
  CANONICAL_DEMO_IDENTITIES,
  DEMO_SEED_ORGANIZATIONS,
  syncDemoUsers,
  type DemoSeedMembershipInput,
  type DemoSeedMembershipRow,
  type DemoSeedOrganizationInput,
  type DemoSeedOrganizationRow,
  type DemoSeedStore,
  type DemoSeedUserInput,
  type DemoSeedUserRow,
} from "./demo-user-seed";

type StoredUser = DemoSeedUserRow & {
  sessionVersion: number;
  untouchedNote?: string;
};

class MemoryDemoSeedStore implements DemoSeedStore {
  organizations: DemoSeedOrganizationRow[] = [];
  users: StoredUser[] = [];
  memberships: DemoSeedMembershipRow[] = [];
  sessions: Array<{ id: string; userId: number; payload: string }> = [];

  private nextOrgId = 101;
  private nextUserId = 1_001;
  private nextMembershipId = 10_001;

  async listOrganizations(
    orgType: "partner" | "vendor",
  ): Promise<DemoSeedOrganizationRow[]> {
    return this.organizations.filter((row) => row.orgType === orgType);
  }

  async createOrganization(
    input: DemoSeedOrganizationInput,
  ): Promise<DemoSeedOrganizationRow | null> {
    const duplicate = this.organizations.find(
      (row) =>
        row.orgType === input.orgType &&
        row.name.trim().toLowerCase() === input.name.trim().toLowerCase(),
    );
    if (duplicate) return null;
    const row = { id: this.nextOrgId++, ...input };
    this.organizations.push(row);
    return row;
  }

  async listUsers(naturalIdentities: readonly string[]): Promise<StoredUser[]> {
    const accepted = new Set(naturalIdentities);
    return this.users.filter((row) =>
      accepted.has((row.email ?? row.username).toLowerCase()),
    );
  }

  async createUser(input: DemoSeedUserInput): Promise<StoredUser | null> {
    if (
      this.users.some(
        (row) => row.username.toLowerCase() === input.username.toLowerCase(),
      )
    ) {
      return null;
    }
    const row: StoredUser = {
      id: this.nextUserId++,
      email: null,
      activeMembershipId: null,
      mustChangePassword: false,
      sessionVersion: 1,
      ...input,
    };
    this.users.push(row);
    return row;
  }

  async updateUserPassword(
    userId: number,
    passwordHash: string,
  ): Promise<void> {
    const row = this.requireUser(userId);
    row.passwordHash = passwordHash;
    row.mustChangePassword = false;
  }

  async clearMustChangePassword(userId: number): Promise<void> {
    this.requireUser(userId).mustChangePassword = false;
  }

  async listMemberships(userId: number): Promise<DemoSeedMembershipRow[]> {
    return this.memberships.filter((row) => row.userId === userId);
  }

  async createMembership(
    input: DemoSeedMembershipInput,
  ): Promise<DemoSeedMembershipRow | null> {
    const duplicate = this.memberships.find(
      (row) =>
        row.userId === input.userId &&
        row.orgType === input.orgType &&
        (row.orgType === "partner"
          ? row.partnerId === input.partnerId
          : row.vendorId === input.vendorId),
    );
    if (duplicate) return null;
    const row = { id: this.nextMembershipId++, ...input };
    this.memberships.push(row);
    return row;
  }

  async setActiveMembership(
    userId: number,
    membershipId: number,
  ): Promise<void> {
    this.requireUser(userId).activeMembershipId = membershipId;
  }

  private requireUser(id: number): StoredUser {
    const user = this.users.find((row) => row.id === id);
    if (!user) throw new Error(`Missing test user ${id}`);
    return user;
  }
}

const passwordCodec = {
  hash: (password: string) => `bcrypt10:${password}`,
  compare: (password: string, hash: string) => hash === `bcrypt10:${password}`,
};

function addExistingUser(
  store: MemoryDemoSeedStore,
  input: Partial<StoredUser> & Pick<StoredUser, "id" | "username">,
): StoredUser {
  const row: StoredUser = {
    email: null,
    passwordHash: "bcrypt10:already-set",
    role: "admin",
    displayName: "Existing user",
    preferredLanguage: null,
    activeMembershipId: null,
    mustChangePassword: false,
    sessionVersion: 1,
    ...input,
  };
  store.users.push(row);
  return row;
}

describe("syncDemoUsers", () => {
  it("bootstraps a fresh schema with generated organization IDs", async () => {
    const store = new MemoryDemoSeedStore();

    const result = await syncDemoUsers(store, passwordCodec);

    expect(result.added).toEqual(DEMO_USERS.map((demo) => demo.username));
    expect(result.passwordReset).toEqual([]);
    expect(store.organizations).toHaveLength(DEMO_SEED_ORGANIZATIONS.length);
    expect(store.users).toHaveLength(DEMO_USERS.length);
    expect(store.memberships).toHaveLength(14);
    expect(store.organizations.every((row) => row.id >= 101)).toBe(true);
    expect(
      store.memberships.every((row) => {
        const orgId = row.orgType === "partner" ? row.partnerId : row.vendorId;
        return store.organizations.some(
          (org) => org.orgType === row.orgType && org.id === orgId,
        );
      }),
    ).toBe(true);
  });

  it("is idempotent when the fresh-schema seed is run again", async () => {
    const store = new MemoryDemoSeedStore();
    await syncDemoUsers(store, passwordCodec);
    const counts = {
      organizations: store.organizations.length,
      users: store.users.length,
      memberships: store.memberships.length,
    };

    const rerun = await syncDemoUsers(store, passwordCodec);

    expect(rerun).toMatchObject({ added: [], passwordReset: [] });
    expect(store.organizations).toHaveLength(counts.organizations);
    expect(store.users).toHaveLength(counts.users);
    expect(store.memberships).toHaveLength(counts.memberships);
  });

  it("restores canonical hashes by lower(coalesce(email, username)) without invalidating sessions", async () => {
    const store = new MemoryDemoSeedStore();
    const canonicalCases = [
      ["admin", "ADMIN@VNDRLY.COM", "vndrly123"],
      ["baker", "baker@vndrly.com", "baker123"],
      ["winchester", "WINCHESTER@VNDRLY.COM", "winchester2"],
      ["mach", "mach@vndrly.com", "mach123"],
      ["exxon", "exxon@vndrly.com", "exxon123"],
    ] as const;

    canonicalCases.forEach(([demoName, email], index) => {
      const user = addExistingUser(store, {
        id: index + 1,
        username: `legacy-login-${index}`,
        email,
        passwordHash: "bcrypt10:drifted",
        sessionVersion: 40 + index,
        mustChangePassword: true,
        untouchedNote: demoName,
      });
      store.sessions.push({
        id: `session-${index}`,
        userId: user.id,
        payload: `payload-${index}`,
      });
    });
    const sessionsBefore = structuredClone(store.sessions);

    const result = await syncDemoUsers(store, passwordCodec);

    for (const [demoName, email, password] of canonicalCases) {
      const row = store.users.find(
        (user) => user.email?.toLowerCase() === email.toLowerCase(),
      );
      expect(row?.passwordHash, demoName).toBe(`bcrypt10:${password}`);
      expect(row?.mustChangePassword, demoName).toBe(false);
      expect(row?.sessionVersion, demoName).toBeGreaterThanOrEqual(40);
      expect(
        CANONICAL_DEMO_IDENTITIES[demoName],
        `${demoName} must retain its documented identity aliases`,
      ).toContain(email.toLowerCase());
    }
    expect(result.passwordReset).toEqual(
      expect.arrayContaining(canonicalCases.map(([name]) => name)),
    );
    expect(store.sessions).toEqual(sessionsBefore);
  });

  it("reuses natural-name and contact-email organization matches without altering existing rows", async () => {
    const store = new MemoryDemoSeedStore();
    const baker = {
      id: 7,
      orgType: "vendor" as const,
      name: "Baker Hughes",
      contactName: "Existing Baker Contact",
      contactEmail: "legacy-baker@example.com",
    };
    const mach = {
      id: 29,
      orgType: "partner" as const,
      name: "Mach Energy Holdings",
      contactName: "Existing Mach Contact",
      contactEmail: "mach@vndrly.com",
    };
    const unrelated = {
      id: 88,
      orgType: "vendor" as const,
      name: "Unrelated Vendor",
      contactName: "Do Not Touch",
      contactEmail: "untouched@example.com",
    };
    store.organizations.push(baker, mach, unrelated);
    const existingRows = structuredClone(store.organizations);

    await syncDemoUsers(store, passwordCodec);

    expect(store.organizations).toEqual(expect.arrayContaining(existingRows));
    expect(
      store.organizations.filter((row) =>
        ["baker hughes", "baker hughes field svcs"].includes(
          row.name.trim().toLowerCase(),
        ),
      ),
    ).toHaveLength(1);
    expect(
      store.organizations.filter(
        (row) => row.contactEmail === "mach@vndrly.com",
      ),
    ).toHaveLength(1);

    const bakerUser = store.users.find((row) => row.username === "baker");
    const bakerMembership = store.memberships.find(
      (row) => row.userId === bakerUser?.id && row.orgType === "vendor",
    );
    expect(bakerMembership?.vendorId).toBe(baker.id);

    const machUser = store.users.find((row) => row.username === "mach");
    const machMembership = store.memberships.find(
      (row) => row.userId === machUser?.id && row.orgType === "partner",
    );
    expect(machMembership?.partnerId).toBe(mach.id);
  });

  it("preserves unrelated users, memberships, and active membership choices", async () => {
    const store = new MemoryDemoSeedStore();
    const existingOrg = {
      id: 55,
      orgType: "partner" as const,
      name: "Customer-Owned Partner",
      contactName: "Owner",
      contactEmail: "owner@example.com",
    };
    store.organizations.push(existingOrg);
    const unrelated = addExistingUser(store, {
      id: 65,
      username: "customer-user",
      email: "customer@example.com",
      passwordHash: "bcrypt10:customer-secret",
      role: "partner",
      displayName: "Customer User",
      sessionVersion: 91,
      activeMembershipId: 75,
      untouchedNote: "preserve me",
    });
    store.memberships.push({
      id: 75,
      userId: unrelated.id,
      orgType: "partner",
      partnerId: existingOrg.id,
      vendorId: null,
      role: "member",
    });
    const before = {
      user: structuredClone(unrelated),
      membership: structuredClone(store.memberships[0]),
      org: structuredClone(existingOrg),
    };

    await syncDemoUsers(store, passwordCodec);

    expect(store.users.find((row) => row.id === unrelated.id)).toEqual(
      before.user,
    );
    expect(store.memberships.find((row) => row.id === 75)).toEqual(
      before.membership,
    );
    expect(store.organizations.find((row) => row.id === 55)).toEqual(
      before.org,
    );
  });
});
