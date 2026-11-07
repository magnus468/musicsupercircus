import type { IsDismissed } from "./reviewCounts";

export function visibleUnmatchedWorks<T extends { work_title: string }>(works: T[], isDismissed: IsDismissed): T[] {
  return works.filter((work) => !isDismissed("unmatched_settlements", work.work_title));
}