import { describe, expect, it } from "vitest";

import { __authTest } from "@/hooks/use-auth";

describe("web auth normalization", () => {
  it("preserves gatekeeper vendor role from the API session payload", () => {
    const user = __authTest.fromResponse({
      userId: 988,
      role: "vendor",
      displayName: "Gate Winchester",
      vendorId: 3,
      vendorPeopleId: 123,
      vendorRole: "gatekeeper",
    });

    expect(user.role).toBe("vendor");
    expect(user.vendorRole).toBe("gatekeeper");
  });
});
