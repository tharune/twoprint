// Times for the charts, in the reader's own time zone.

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

const clock = new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
const day = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" });
const month = new Intl.DateTimeFormat(undefined, { month: "short", year: "numeric" });
const full = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

/** An axis label for a moment on a chart that spans `span` milliseconds: the clock for a day or so, the date for longer. */
export function axisTime(t: number, span: number): string {
  const d = new Date(t);
  if (span <= 1.5 * DAY) return clock.format(d);
  if (span <= 120 * DAY) return day.format(d);
  return month.format(d);
}

const fullSeconds = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" });

/** A moment in full, for a tooltip: "Oct 19, 17:42". */
export const fullTime = (t: number): string => full.format(new Date(t));

/** A moment to the second, for the oracle's own updates, which come every few seconds: "Oct 19, 17:42:31". */
export const fullTimeSeconds = (t: number): string => fullSeconds.format(new Date(t));

/** The browser's time zone name, for an embed that wants one. */
export const localZone = (): string => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "Etc/UTC";
  } catch {
    return "Etc/UTC";
  }
};
