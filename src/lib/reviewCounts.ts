export type IsDismissed = (section: string, key: string) => boolean;

export function countVisibleReviewItems<T>(
  items: T[], section: string, key: (item: T) => string, isDismissed: IsDismissed,
) {
  return items.filter((item) => !isDismissed(section, key(item))).length;
}

export function countDuplicateGroups(
  works: { title: string; project?: string | null }[], isDismissed: IsDismissed,
) {
  const normalize = (s?: string | null) => (s ?? "").trim().toLowerCase();
  const groups = new Map<string, number>();
  for (const work of works) {
    const key = `${normalize(work.title)}||${normalize(work.project)}`;
    groups.set(key, (groups.get(key) ?? 0) + 1);
  }
  return [...groups].filter(([key, count]) => count > 1 && !isDismissed("duplicates", key)).length;
}

export function countConflictGroups(
  conflicts: { work_id: string; party_name: string; conflict_note: string | null }[],
  isDismissed: IsDismissed,
) {
  return new Set(conflicts
    .filter((c) => !isDismissed("conflicts", `${c.work_id}|${c.party_name}`))
    .map((c) => `${c.party_name}|${c.conflict_note}`)).size;
}