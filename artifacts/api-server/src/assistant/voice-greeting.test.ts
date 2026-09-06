import { describe, expect, it } from "vitest";
import {
  buildAskVGreeting,
  localCalendarDate,
  timeOfDayGreeting,
} from "./voice-greeting";

describe("AskV daily greeting", () => {
  it("computes the local calendar date from a timezone", () => {
    const lateUtc = new Date("2026-09-07T03:00:00.000Z");
    expect(localCalendarDate(lateUtc, "America/Chicago")).toBe("2026-09-06");
    expect(localCalendarDate(lateUtc, "UTC")).toBe("2026-09-07");
  });

  it("picks a time-appropriate greeting word", () => {
    expect(timeOfDayGreeting(new Date("2026-09-06T14:00:00.000Z"), "America/Chicago")).toBe("morning");
    expect(timeOfDayGreeting(new Date("2026-09-06T19:00:00.000Z"), "America/Chicago")).toBe("afternoon");
    expect(timeOfDayGreeting(new Date("2026-09-07T02:00:00.000Z"), "America/Chicago")).toBe("evening");
  });

  it("returns a full greeting once per local calendar day", () => {
    const now = new Date("2026-09-06T16:00:00.000Z");
    const first = buildAskVGreeting({
      displayName: "Brian Elerick",
      lastFullGreetingOn: null,
      timeZone: "America/Chicago",
      now,
    });
    expect(first.style).toBe("full");
    expect(first.localDate).toBe("2026-09-06");
    expect(first.text).toBe(
      "Good morning, Brian. I'm listening and ready when you are. How can I help?",
    );

    const later = buildAskVGreeting({
      displayName: "Brian Elerick",
      lastFullGreetingOn: "2026-09-06",
      timeZone: "America/Chicago",
      now,
    });
    expect(later).toEqual({
      style: "short",
      localDate: "2026-09-06",
      text: "I'm listening.",
    });
  });
});
