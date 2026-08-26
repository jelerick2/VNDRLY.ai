import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const easConfig = JSON.parse(
  await readFile(
    new URL("../../artifacts/vndrly-mobile/eas.json", import.meta.url),
    "utf8",
  ),
);

test("TestFlight submission resolves its App Store key from EAS credentials", () => {
  const iosSubmit = easConfig.submit?.production?.ios;

  assert.equal(iosSubmit?.ascAppId, "6771456209");
  assert.equal(iosSubmit?.ascApiKeyPath, undefined);
  assert.equal(iosSubmit?.ascApiKeyId, undefined);
  assert.equal(iosSubmit?.ascApiKeyIssuerId, undefined);
});
