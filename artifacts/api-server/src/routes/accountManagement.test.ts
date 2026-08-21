import { beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";
import { attachTestErrorMiddleware, expectStatus } from "../test-utils/route-app";

const selectRows = vi.hoisted(() => ({ queue: [] as unknown[][] }));
const updateSetMock = vi.hoisted(() => vi.fn());
const sendAdminResetPasswordEmailMock = vi.hoisted(() => vi.fn());
const getSessionFromRequestMock = vi.hoisted(() => vi.fn());

vi.mock("@workspace/db", () => ({
  db: {
    select: () => ({
      from: () => ({
        where: () => Promise.resolve(selectRows.queue.shift() ?? []),
      }),
    }),
    update: () => ({
      set: updateSetMock,
    }),
  },
  usersTable: {
    id: "users.id",
    username: "users.username",
    email: "users.email",
    displayName: "users.display_name",
    preferredLanguage: "users.preferred_language",
    passwordHash: "users.password_hash",
    mustChangePassword: "users.must_change_password",
    sessionVersion: "users.session_version",
  },
  userOrgMembershipsTable: {
    id: "memberships.id",
    userId: "memberships.user_id",
    orgType: "memberships.org_type",
    partnerId: "memberships.partner_id",
    vendorId: "memberships.vendor_id",
  },
}));

vi.mock("../lib/session", () => ({
  getSessionFromRequest: getSessionFromRequestMock,
}));

vi.mock("../lib/sendgrid", () => ({
  sendAdminResetPasswordEmail: sendAdminResetPasswordEmailMock,
}));

vi.mock("../lib/vendor-people-management", () => ({
  canManageVendorPeople: async () => false,
}));

vi.mock("../lib/office-role", () => ({
  userIsVendorOffice: async () => false,
}));

import accountManagementRouter from "./accountManagement";

function app() {
  const a = express();
  a.use(express.json());
  a.use(accountManagementRouter);
  attachTestErrorMiddleware(a);
  return a;
}

describe("POST /users/:id/admin-reset-password", () => {
  beforeEach(() => {
    selectRows.queue = [
      [{ displayName: "System Admin" }],
      [
        {
          id: 42,
          username: "legacy-login",
          email: "crew.member@example.com",
          displayName: "Crew Member",
          preferredLanguage: "en",
        },
      ],
    ];
    updateSetMock.mockReset().mockReturnValue({
      where: vi.fn(async () => undefined),
    });
    sendAdminResetPasswordEmailMock
      .mockReset()
      .mockResolvedValue({ messageId: "msg_123" });
    getSessionFromRequestMock.mockReset().mockReturnValue({
      userId: 1,
      role: "admin",
    });
  });

  it("emails the stored email address when it differs from username", async () => {
    const res = await request(app())
      .post("/users/42/admin-reset-password")
      .send({ tempPassword: "TempPass123!" });

    expectStatus(res, 200);
    expect(res.body).toMatchObject({ ok: true, emailSent: true });
    expect(sendAdminResetPasswordEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "crew.member@example.com",
        displayName: "Crew Member",
        adminDisplayName: "System Admin",
        tempPassword: "TempPass123!",
        locale: "en",
      }),
    );
  });
});
