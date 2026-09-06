export type AskVGreetingStyle = "full" | "short";
export type AskVTimeOfDay = "morning" | "afternoon" | "evening";

export interface BuildAskVGreetingArgs {
  displayName: string;
  lastFullGreetingOn: string | null;
  timeZone: string;
  now?: Date;
}

export interface AskVGreeting {
  style: AskVGreetingStyle;
  localDate: string;
  text: string;
}

export function localCalendarDate(now: Date, timeZone: string): string {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(now);
  } catch {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "UTC",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(now);
  }
}

export function timeOfDayGreeting(now: Date, timeZone: string): AskVTimeOfDay {
  let hour = 12;
  try {
    hour = Number(
      new Intl.DateTimeFormat("en-US", {
        timeZone,
        hour: "numeric",
        hourCycle: "h23",
      }).format(now),
    );
  } catch {
    hour = now.getUTCHours();
  }
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}

export function firstNameFromDisplayName(displayName: string): string {
  const first = displayName.trim().split(/\s+/)[0];
  return first || "there";
}

export function buildAskVGreeting(args: BuildAskVGreetingArgs): AskVGreeting {
  const now = args.now ?? new Date();
  const localDate = localCalendarDate(now, args.timeZone);
  if (args.lastFullGreetingOn === localDate) {
    return { style: "short", localDate, text: "I'm listening." };
  }
  const name = firstNameFromDisplayName(args.displayName);
  const period = timeOfDayGreeting(now, args.timeZone);
  return {
    style: "full",
    localDate,
    text: `Good ${period}, ${name}. I'm listening and ready when you are. How can I help?`,
  };
}
