import { and, eq, ilike, isNull, or } from "drizzle-orm";
import {
  db,
  siteLocationsTable,
  siteVisitsTable,
  ticketsTable,
  vendorPeopleTable,
} from "@workspace/db";
import type { SessionPayload } from "../lib/session";
import { fieldEmployeeCanAccessTicket, loadFieldTicketAccessRow } from "../lib/field-ticket-access";
import { askvIdempotency } from "./askv-idempotency";

function err(message: string): string {
  return JSON.stringify({ error: message });
}

function confirmationErr(message: string): string {
  return JSON.stringify({ error: message, requiresConfirmation: true });
}

function reuse(session: SessionPayload, key: string | undefined): string | null {
  if (!session.userId || !key) return null;
  const existing = askvIdempotency.peek(session.userId, key);
  return existing == null ? null : JSON.stringify(existing);
}

function remember(session: SessionPayload, key: string | undefined, value: unknown): string {
  if (!session.userId || !key) return JSON.stringify(value);
  const stored = askvIdempotency.remember(session.userId, key, value);
  return JSON.stringify(stored.value);
}

function missingCheckInFields(input: Record<string, unknown>): string[] {
  const missing: string[] = [];
  if (!String(input.firstName ?? "").trim()) missing.push("firstName");
  if (!String(input.lastName ?? "").trim()) missing.push("lastName");
  if (typeof input.siteLocationId !== "number") missing.push("siteLocationId");
  if (input.hostType !== "partner" && input.hostType !== "vendor") missing.push("hostType");
  return missing;
}

export async function prepareVisitorCheckIn(input: unknown): Promise<string> {
  const args = (input ?? {}) as Record<string, unknown>;
  const missing = missingCheckInFields(args);
  return JSON.stringify({
    ok: missing.length === 0,
    action: "prepare_visitor_check_in",
    missing,
    draft: args,
  });
}

export async function confirmVisitorCheckIn(input: unknown, session: SessionPayload): Promise<string> {
  const args = (input ?? {}) as Record<string, unknown>;
  const cached = reuse(session, typeof args.idempotencyKey === "string" ? args.idempotencyKey : undefined);
  if (cached) return cached;
  if (args.confirmed !== true) return confirmationErr("Confirm visitor check-in before I commit it.");
  const missing = missingCheckInFields(args);
  if (missing.length) return err(`Missing ${missing.join(", ")}.`);
  if (!session.userId) return err("You must be signed in.");

  const siteId = Number(args.siteLocationId);
  const [site] = await db.select().from(siteLocationsTable).where(eq(siteLocationsTable.id, siteId)).limit(1);
  if (!site) return err("Site not found.");

  const [created] = await db
    .insert(siteVisitsTable)
    .values({
      siteLocationId: siteId,
      firstName: String(args.firstName).trim(),
      lastName: String(args.lastName).trim(),
      company: typeof args.company === "string" ? args.company : null,
      vehiclePlate: typeof args.vehiclePlate === "string" ? args.vehiclePlate : null,
      plateState: typeof args.plateState === "string" ? args.plateState : null,
      purpose: typeof args.purpose === "string" ? args.purpose : null,
      notes: typeof args.notes === "string" ? args.notes : null,
      expectedDurationMinutes:
        typeof args.expectedDurationMinutes === "number" ? args.expectedDurationMinutes : null,
      hostType: args.hostType === "vendor" ? "vendor" : "partner",
      hostPartnerId: args.hostType === "partner" ? (session.partnerId ?? site.partnerId) : null,
      hostVendorId: args.hostType === "vendor" ? session.vendorId ?? null : null,
      checkInLatitude: typeof args.latitude === "number" ? args.latitude : null,
      checkInLongitude: typeof args.longitude === "number" ? args.longitude : null,
      recordedByUserId: session.userId,
    })
    .returning({ id: siteVisitsTable.id });

  return remember(session, typeof args.idempotencyKey === "string" ? args.idempotencyKey : undefined, {
    ok: true,
    visitId: created?.id,
    refresh: ["gate", "visits"],
  });
}

export async function findActiveVisitors(input: unknown): Promise<string> {
  const args = (input ?? {}) as Record<string, unknown>;
  const conds = [isNull(siteVisitsTable.checkOutTime)];
  if (typeof args.siteLocationId === "number") {
    conds.push(eq(siteVisitsTable.siteLocationId, args.siteLocationId));
  }
  if (typeof args.vehiclePlate === "string" && args.vehiclePlate.trim()) {
    conds.push(ilike(siteVisitsTable.vehiclePlate, args.vehiclePlate.trim()));
  }
  if (typeof args.query === "string" && args.query.trim()) {
    const q = `%${args.query.trim()}%`;
    conds.push(
      or(
        ilike(siteVisitsTable.firstName, q),
        ilike(siteVisitsTable.lastName, q),
        ilike(siteVisitsTable.company, q),
        ilike(siteVisitsTable.vehiclePlate, q),
      )!,
    );
  }
  const rows = await db
    .select({
      id: siteVisitsTable.id,
      firstName: siteVisitsTable.firstName,
      lastName: siteVisitsTable.lastName,
      company: siteVisitsTable.company,
      vehiclePlate: siteVisitsTable.vehiclePlate,
      siteLocationId: siteVisitsTable.siteLocationId,
    })
    .from(siteVisitsTable)
    .where(and(...conds))
    .limit(8);
  return JSON.stringify({ ok: true, matches: rows, needsChoice: rows.length > 1 });
}

export async function prepareVisitorCheckOut(input: unknown): Promise<string> {
  const found = JSON.parse(await findActiveVisitors(input)) as {
    matches: Array<{ id: number }>;
    needsChoice: boolean;
  };
  return JSON.stringify({
    ok: found.matches.length > 0,
    action: "prepare_visitor_check_out",
    matches: found.matches,
    needsChoice: found.needsChoice,
    missing: found.matches.length === 0 ? ["visit"] : [],
  });
}

export async function confirmVisitorCheckOut(input: unknown, session: SessionPayload): Promise<string> {
  const args = (input ?? {}) as Record<string, unknown>;
  const cached = reuse(session, typeof args.idempotencyKey === "string" ? args.idempotencyKey : undefined);
  if (cached) return cached;
  if (args.confirmed !== true) return confirmationErr("Confirm visitor check-out before I commit it.");
  if (typeof args.visitId !== "number") return err("Missing visitId.");
  const [updated] = await db
    .update(siteVisitsTable)
    .set({
      checkOutTime: new Date(),
      checkOutNotes: typeof args.notes === "string" ? args.notes : null,
      checkOutLatitude: typeof args.latitude === "number" ? args.latitude : null,
      checkOutLongitude: typeof args.longitude === "number" ? args.longitude : null,
    })
    .where(and(eq(siteVisitsTable.id, args.visitId), isNull(siteVisitsTable.checkOutTime)))
    .returning({ id: siteVisitsTable.id });
  if (!updated) return err("No matching active visit.");
  return remember(session, typeof args.idempotencyKey === "string" ? args.idempotencyKey : undefined, {
    ok: true,
    visitId: updated.id,
    refresh: ["gate", "visits"],
  });
}

async function canMutateTicket(ticketId: number, session: SessionPayload): Promise<boolean> {
  const ticket = await loadFieldTicketAccessRow(ticketId);
  if (!ticket) return false;
  if (session.role === "admin") return true;
  if (session.role === "vendor" && session.vendorId != null && session.vendorId === ticket.vendorId) {
    return true;
  }
  if (session.role === "field_employee" && session.userId) {
    const [employee] = await db
      .select({
        id: vendorPeopleTable.id,
        vendorId: vendorPeopleTable.vendorId,
        userId: vendorPeopleTable.userId,
      })
      .from(vendorPeopleTable)
      .where(
        and(
          eq(vendorPeopleTable.userId, session.userId),
          isNull(vendorPeopleTable.deletedAt),
        ),
      )
      .limit(1);
    if (!employee?.userId) return false;
    return fieldEmployeeCanAccessTicket(ticketId, { ...employee, userId: employee.userId }, ticket);
  }
  return false;
}

const LIFECYCLE_TO_STATE: Record<string, string> = {
  en_route: "en_route",
  on_location: "on_location",
  on_site: "on_site",
  work_complete: "off_site",
  off_site: "off_site",
};

export async function setTicketLifecycle(input: unknown, session: SessionPayload): Promise<string> {
  const args = (input ?? {}) as Record<string, unknown>;
  const cached = reuse(session, typeof args.idempotencyKey === "string" ? args.idempotencyKey : undefined);
  if (cached) return cached;
  if (typeof args.ticketId !== "number" || typeof args.phase !== "string") {
    return err("ticketId and phase are required.");
  }
  const lifecycleState = LIFECYCLE_TO_STATE[args.phase];
  if (!lifecycleState) return err("Unknown lifecycle phase.");
  if (!(await canMutateTicket(args.ticketId, session))) {
    return err("You cannot update this ticket.");
  }
  const [updated] = await db
    .update(ticketsTable)
    .set({
      lifecycleState,
      ...(args.phase === "en_route" ? { enRouteAt: new Date() } : {}),
      ...(args.phase === "on_location" ? { arrivedAt: new Date() } : {}),
      ...(args.phase === "on_site" ? { checkInTime: new Date(), status: "in_progress" } : {}),
      ...(args.phase === "off_site" || args.phase === "work_complete"
        ? { checkOutTime: new Date(), lifecycleState: "off_site" }
        : {}),
    })
    .where(eq(ticketsTable.id, args.ticketId))
    .returning({ id: ticketsTable.id, lifecycleState: ticketsTable.lifecycleState });
  if (!updated) return err("Ticket not found.");
  return remember(session, typeof args.idempotencyKey === "string" ? args.idempotencyKey : undefined, {
    ok: true,
    ticketId: updated.id,
    lifecycleState: updated.lifecycleState,
  });
}

export async function closeTicketForReview(input: unknown, session: SessionPayload): Promise<string> {
  const args = (input ?? {}) as Record<string, unknown>;
  const cached = reuse(session, typeof args.idempotencyKey === "string" ? args.idempotencyKey : undefined);
  if (cached) return cached;
  if (args.confirmed !== true) return confirmationErr("Confirm closing this ticket for review.");
  if (typeof args.ticketId !== "number") return err("Missing ticketId.");
  if (!(await canMutateTicket(args.ticketId, session))) {
    return err("You cannot close this ticket.");
  }
  const [updated] = await db
    .update(ticketsTable)
    .set({
      status: "pending_review",
      lifecycleState: "off_site",
      closedAt: new Date(),
    })
    .where(eq(ticketsTable.id, args.ticketId))
    .returning({ id: ticketsTable.id, status: ticketsTable.status });
  if (!updated) return err("Ticket not found.");
  return remember(session, typeof args.idempotencyKey === "string" ? args.idempotencyKey : undefined, {
    ok: true,
    ticketId: updated.id,
    status: updated.status,
  });
}

export async function draftSafetyReport(input: unknown): Promise<string> {
  const args = (input ?? {}) as Record<string, unknown>;
  const missing: string[] = [];
  if (!String(args.title ?? "").trim()) missing.push("title");
  if (typeof args.siteLocationId !== "number") missing.push("siteLocationId");
  if (!String(args.eventType ?? "").trim()) missing.push("eventType");
  return JSON.stringify({
    ok: missing.length === 0,
    action: "draft_safety_report",
    submitted: false,
    missing,
    draft: args,
  });
}
