import bcrypt from "bcryptjs";
import { db, usersTable } from "@workspace/db";
import { inArray, sql } from "drizzle-orm";
import {
  demoPasswordRecoverySpecs,
  demoUserNaturalIdentity,
} from "./demo-user-seed";
import { logger } from "./logger";

/**
 * Dev-only startup self-check: warn if any seeded demo username exists
 * with a bcrypt hash that does NOT verify against its documented canonical
 * password. This includes recovery-only identities such as Joe Boggs without
 * creating those accounts. The check catches the failure mode from Task #739
 * where a SQL import (or a manual change) leaves a stale hash behind, so
 * `admin/vndrly123`, `exxon/exxon123`, etc. silently 401 on every login
 * attempt and there is no in-product signal of why.
 *
 * The check is read-only — it logs a one-line warning per drifted demo
 * user and a single "how to recover" hint. Nothing is rewritten on boot;
 * recovery happens by calling `POST /api/auth/seed`, which idempotently
 * re-hashes drifted demo passwords back to the canonical value.
 */
export async function verifyDemoPasswords(): Promise<void> {
  try {
    const recoveries = demoPasswordRecoverySpecs();
    const identities = [
      ...new Set(
        recoveries.flatMap((recovery) => recovery.naturalIdentities),
      ),
    ];
    if (identities.length === 0) return;

    const rows = await db
      .select({
        id: usersTable.id,
        username: usersTable.username,
        email: usersTable.email,
        passwordHash: usersTable.passwordHash,
      })
      .from(usersTable)
      .where(
        inArray(
          sql`lower(coalesce(${usersTable.email}, ${usersTable.username}))`,
          identities,
        ),
      );

    const drifted: string[] = [];
    for (const recovery of recoveries) {
      const aliases = new Set(recovery.naturalIdentities);
      const matches = rows.filter((row) =>
        aliases.has(demoUserNaturalIdentity(row)),
      );
      if (matches.length === 0) continue; // not seeded yet
      if (
        matches.some(
          (row) =>
            !bcrypt.compareSync(recovery.password, row.passwordHash),
        )
      ) {
        drifted.push(recovery.name);
      }
    }

    if (drifted.length === 0) return;

    logger.warn(
      { drifted },
      "verifyDemoPasswords: demo logins have stale password hashes — POST /api/auth/seed to restore them",
    );
  } catch (err) {
    // Self-check is best-effort. Never let a DB hiccup take down boot.
    logger.error({ err }, "verifyDemoPasswords: self-check failed");
  }
}
