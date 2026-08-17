import { describe, expect, it } from "vitest";
import {
  ensureDeepLinksInAssistantReply,
  normalizeAssistantMarkdownHref,
  repairAssistantMarkdownLinks,
} from "./deep-link-markdown";

describe("deep-link-markdown", () => {
  it("normalizes bare screen slugs to leading-slash paths", () => {
    expect(normalizeAssistantMarkdownHref("bills-to-pay")).toBe("/bills-to-pay");
  });

  it("repairs markdown links missing a leading slash", () => {
    expect(repairAssistantMarkdownLinks("[Open bills to pay](bills-to-pay)")).toBe(
      "[Open bills to pay](/bills-to-pay)",
    );
  });

  it("prepends a link when deep_link_to ran but the model omitted the url", () => {
    const out = ensureDeepLinksInAssistantReply(
      "You have 8 open invoices waiting for payment.",
      [{ name: "deep_link_to", output: JSON.stringify({ url: "/bills-to-pay" }) }],
    );
    expect(out.startsWith("[Open Bills to Pay](/bills-to-pay)")).toBe(true);
    expect(out).toContain("You have 8 open invoices");
  });

  it("does not duplicate when the reply already contains the path", () => {
    const text = "[Open Bills to Pay](/bills-to-pay)\n\nYou have 8 open invoices.";
    const out = ensureDeepLinksInAssistantReply(text, [
      { name: "deep_link_to", output: JSON.stringify({ url: "/bills-to-pay" }) },
    ]);
    expect(out).toBe(text);
  });

  it("prepends actionable links from map tool outputs", () => {
    const out = ensureDeepLinksInAssistantReply(
      "Using your current location, ticket #42 is 18.4 road miles away.",
      [
        {
          name: "query_ticket_route_eta",
          output: JSON.stringify({
            ok: true,
            actions: [
              { label: "Open ticket #42", url: "/tickets/42" },
              { label: "Open map", url: "/crew-map?ticketId=42" },
              {
                label: "Start navigation",
                url: "https://www.google.com/maps/dir/?api=1&destination=32.1,-102.2",
              },
            ],
          }),
        },
      ],
    );

    expect(out.startsWith(
      "[Open ticket #42](/tickets/42)\n[Open map](/crew-map?ticketId=42)\n[Start navigation](https://www.google.com/maps/dir/?api=1&destination=32.1,-102.2)",
    )).toBe(true);
    expect(out).toContain("18.4 road miles");
  });
});
