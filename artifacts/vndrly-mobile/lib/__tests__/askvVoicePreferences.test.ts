import { beforeEach, describe, expect, it, vi } from "vitest";
import { readAskVTextOnly, writeAskVTextOnly } from "../askvVoicePreferences";

const store = new Map<string, string>();

vi.mock("expo-secure-store", () => ({
  getItemAsync: vi.fn(async (key: string) => store.get(key) ?? null),
  setItemAsync: vi.fn(async (key: string, value: string) => {
    store.set(key, value);
  }),
  deleteItemAsync: vi.fn(async (key: string) => {
    store.delete(key);
  }),
}));

describe("mobile AskV voice preferences", () => {
  beforeEach(() => {
    store.clear();
  });

  it("persists remembered text-only mode per user", async () => {
    expect(await readAskVTextOnly(11)).toBe(false);
    await writeAskVTextOnly(11, true);
    expect(await readAskVTextOnly(11)).toBe(true);
    expect(await readAskVTextOnly(12)).toBe(false);
    await writeAskVTextOnly(11, false);
    expect(await readAskVTextOnly(11)).toBe(false);
  });
});
