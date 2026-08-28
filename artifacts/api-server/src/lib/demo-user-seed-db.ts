import {
  db,
  partnersTable,
  userOrgMembershipsTable,
  usersTable,
  vendorsTable,
} from "@workspace/db";
import { eq, inArray, sql } from "drizzle-orm";
import bcrypt from "bcryptjs";
import {
  syncDemoUsers,
  type DemoSeedMembershipRole,
  type DemoSeedOrgType,
  type DemoSeedResult,
  type DemoSeedUserRow,
} from "./demo-user-seed";

function asOrgType(value: string): DemoSeedOrgType {
  if (value === "partner" || value === "vendor") return value;
  throw new Error(`Invalid demo membership organization type: ${value}`);
}

function asMembershipRole(value: string): DemoSeedMembershipRole {
  if (
    value === "admin" ||
    value === "member" ||
    value === "ap" ||
    value === "field_employee"
  ) {
    return value;
  }
  throw new Error(`Invalid demo membership role: ${value}`);
}

function asPreferredLanguage(value: string | null): "en" | "es" | "pt" | null {
  if (value === "en" || value === "es" || value === "pt") return value;
  return null;
}

/**
 * Drizzle adapter for the pure demo-user seed state machine. Every write runs
 * in one transaction; organization and membership inserts use conflict-safe
 * retries while the state machine performs all natural-key decisions.
 */
export async function syncDemoUsersInDatabase(): Promise<DemoSeedResult> {
  return db.transaction(async (tx) =>
    syncDemoUsers(
      {
        async listOrganizations(orgType) {
          if (orgType === "partner") {
            const rows = await tx
              .select({
                id: partnersTable.id,
                name: partnersTable.name,
                contactName: partnersTable.contactName,
                contactEmail: partnersTable.contactEmail,
              })
              .from(partnersTable);
            return rows.map((row) => ({ ...row, orgType: "partner" }));
          }
          const rows = await tx
            .select({
              id: vendorsTable.id,
              name: vendorsTable.name,
              contactName: vendorsTable.contactName,
              contactEmail: vendorsTable.contactEmail,
            })
            .from(vendorsTable);
          return rows.map((row) => ({ ...row, orgType: "vendor" }));
        },
        async createOrganization(input) {
          if (input.orgType === "partner") {
            const [row] = await tx
              .insert(partnersTable)
              .values({
                name: input.name,
                contactName: input.contactName,
                contactEmail: input.contactEmail,
              })
              .onConflictDoNothing()
              .returning({
                id: partnersTable.id,
                name: partnersTable.name,
                contactName: partnersTable.contactName,
                contactEmail: partnersTable.contactEmail,
              });
            return row ? { ...row, orgType: "partner" } : null;
          }
          const [row] = await tx
            .insert(vendorsTable)
            .values({
              name: input.name,
              contactName: input.contactName,
              contactEmail: input.contactEmail,
            })
            .onConflictDoNothing()
            .returning({
              id: vendorsTable.id,
              name: vendorsTable.name,
              contactName: vendorsTable.contactName,
              contactEmail: vendorsTable.contactEmail,
            });
          return row ? { ...row, orgType: "vendor" } : null;
        },
        async listUsers(naturalIdentities) {
          const rows = await tx
            .select({
              id: usersTable.id,
              username: usersTable.username,
              email: usersTable.email,
              passwordHash: usersTable.passwordHash,
              role: usersTable.role,
              displayName: usersTable.displayName,
              preferredLanguage: usersTable.preferredLanguage,
              activeMembershipId: usersTable.activeMembershipId,
              mustChangePassword: usersTable.mustChangePassword,
            })
            .from(usersTable)
            .where(
              inArray(
                sql`lower(coalesce(${usersTable.email}, ${usersTable.username}))`,
                naturalIdentities,
              ),
            );
          return rows.map(
            (row): DemoSeedUserRow => ({
              ...row,
              role: row.role as DemoSeedUserRow["role"],
              preferredLanguage: asPreferredLanguage(row.preferredLanguage),
            }),
          );
        },
        async createUser(input) {
          const [row] = await tx
            .insert(usersTable)
            .values(input)
            .onConflictDoNothing()
            .returning({
              id: usersTable.id,
              username: usersTable.username,
              email: usersTable.email,
              passwordHash: usersTable.passwordHash,
              role: usersTable.role,
              displayName: usersTable.displayName,
              preferredLanguage: usersTable.preferredLanguage,
              activeMembershipId: usersTable.activeMembershipId,
              mustChangePassword: usersTable.mustChangePassword,
            });
          return row
            ? {
                ...row,
                role: row.role as DemoSeedUserRow["role"],
                preferredLanguage: asPreferredLanguage(row.preferredLanguage),
              }
            : null;
        },
        async updateUserPassword(userId, passwordHash) {
          await tx
            .update(usersTable)
            .set({ passwordHash, mustChangePassword: false })
            .where(eq(usersTable.id, userId));
        },
        async clearMustChangePassword(userId) {
          await tx
            .update(usersTable)
            .set({ mustChangePassword: false })
            .where(eq(usersTable.id, userId));
        },
        async listMemberships(userId) {
          const rows = await tx
            .select({
              id: userOrgMembershipsTable.id,
              userId: userOrgMembershipsTable.userId,
              orgType: userOrgMembershipsTable.orgType,
              partnerId: userOrgMembershipsTable.partnerId,
              vendorId: userOrgMembershipsTable.vendorId,
              role: userOrgMembershipsTable.role,
            })
            .from(userOrgMembershipsTable)
            .where(eq(userOrgMembershipsTable.userId, userId));
          return rows.map((row) => ({
            ...row,
            orgType: asOrgType(row.orgType),
            role: asMembershipRole(row.role),
          }));
        },
        async createMembership(input) {
          const [row] = await tx
            .insert(userOrgMembershipsTable)
            .values(input)
            .onConflictDoNothing()
            .returning({
              id: userOrgMembershipsTable.id,
              userId: userOrgMembershipsTable.userId,
              orgType: userOrgMembershipsTable.orgType,
              partnerId: userOrgMembershipsTable.partnerId,
              vendorId: userOrgMembershipsTable.vendorId,
              role: userOrgMembershipsTable.role,
            });
          return row
            ? {
                ...row,
                orgType: asOrgType(row.orgType),
                role: asMembershipRole(row.role),
              }
            : null;
        },
        async setActiveMembership(userId, membershipId) {
          await tx
            .update(usersTable)
            .set({ activeMembershipId: membershipId })
            .where(eq(usersTable.id, userId));
        },
      },
      {
        hash: (password) => bcrypt.hashSync(password, 10),
        compare: (password, passwordHash) =>
          bcrypt.compareSync(password, passwordHash),
      },
    ),
  );
}
