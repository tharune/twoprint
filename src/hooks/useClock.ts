import { useMemo } from "react";
import { useApp } from "../app-context";
import { blockClock } from "../lib/series";

/** A block number to a time, read off the oracle's prints and rebuilt as more of them arrive. The charts of events share it. */
export function useClock() {
  const { prints } = useApp();
  return useMemo(() => blockClock(prints), [prints, prints[0].length, prints[1].length]);
}
