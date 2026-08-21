import { beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";
import { attachTestErrorMiddleware, expectStatus } from "../test-utils/route-app";

const selectRows = vi.hoisted(() => ({ value: [] as unknown[] }));
const insertValuesMock = vi.hoisted(() => vi.fn());
const sendPasswordResetEmailMock = vi.hoisted(() => vi.fn());

vi.mock("@workspace/db", () => ({
  db: {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: () => Promise.resolve(selectRows.value),
        }),
      }),
    }),
    insert: () => ({
      values: insertValuesMock,
    }),
  },
  usersTable: {
    id: "users.id",
    username: "users.username",
    email: "users.email",
  },
  passwordResetTokensTable: {
    userId: "password_reset_tokens.user_id",
    tokenHash: "password_reset_tokens.token_hash",
    expiresAt: "password_reset_tokens.expires_at",
    usedAt: "password_reset_tokens.used_at",
  },
}));

vi.mock("../lib/sendgrid", () => ({
  sendPasswordResetEmail: sendPasswordResetEmailMock,
}));

vi.mock("../lib/appOrigin", () => ({
  getAppOrigin: () => "https://vndrly.ai",
}));

import passwordResetRouter from "./passwordReset";

function app() {
  const a = express();
  a.use(express.json());
  a.use(passwordResetRouter);
  attachTestErrorMiddleware(a);
  return a;
}

describe("POST /auth/forgot-password", () => {
  beforeEach(() => {
    selectRows.value = [];
    insertValuesMock.mockReset().mockResolvedValue(undefined);
    sendPasswordResetEmailMock.mockReset().mockResolvedValue({ messageId: "msg_123" });
  });

  it("does not reveal whether an email exists", async () => {
    const res = await request(app())
      .post("/auth/forgot-password")
      .send({ email: "missing@example.com" });

    expectStatus(res, 200);
    expect(res.body.message).toMatch(/If an account exists/i);
    expect(insertValuesMock).not.toHaveBeenCalled();
    expect(sendPasswordResetEmailMock).not.toHaveBeenCalled();
  });

  it("sends reset email to the stored email address when username differs", async () => {
    selectRows.value = [
      {
        id: 42,
        username: "legacy-login",
        email: "real.user@example.com",
        displayName: "Real User",
      },
    ];

    const res = await request(app())
      .post("/auth/forgot-password")
      .send({ email: "real.user@example.com" });

    expectStatus(res, 200);
    expect(insertValuesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 42,
        tokenHash: expect.any(String),
        expiresAt: expect.any(Date),
      }),
    );
    expect(sendPasswordResetEmailMock).toHaveBeenCalledWith(
      "real.user@example.com",
      expect.stringMatching(/^https:\/\/vndrly\.ai\/reset-password\?token=[a-f0-9]{64}$/),
      "Real User",
    );
  });
});
