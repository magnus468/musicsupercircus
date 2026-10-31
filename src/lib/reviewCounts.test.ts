import { describe, expect, it } from "vitest";
import { countVisibleReviewItems, countDuplicateGroups, countConflictGroups } from "./reviewCounts";

const dismissed = new Set(["issues:w1", "reg_mismatch:r1", "duplicates:answers||project", "conflicts:w1|Publisher"]);
const isDismissed = (section: string, key: string) => dismissed.has(`${section}:${key}`);

describe("dashboard dismissal parity", () => {
  it("excludes a dismissed work issue but not another work", () => {
    expect(countVisibleReviewItems([{ id: "w1" }, { id: "w2" }], "issues", (w) => w.id, isDismissed)).toBe(1);
  });
  it("counts registration receipts by receipt ID and returns zero when all are dismissed", () => {
    expect(countVisibleReviewItems([{ id: "r1" }], "reg_mismatch", (r) => r.id, isDismissed)).toBe(0);
    expect(countVisibleReviewItems([{ id: "r1" }], "reg_uncertain", (r) => r.id, isDismissed)).toBe(1);
  });
  it("excludes normalized duplicate groups without hiding the same title in another project", () => {
    expect(countDuplicateGroups([
      { title: "Answers ", project: " Project" }, { title: "answers", project: "project" },
      { title: "Answers", project: "other" }, { title: "Answers", project: "other" },
    ], isDismissed)).toBe(1);
  });
  it("counts visible party/note groups and only removes the dismissed work-party pair", () => {
    const rows = [
      { work_id: "w1", party_name: "Publisher", conflict_note: "IPI" },
      { work_id: "w2", party_name: "Publisher", conflict_note: "IPI" },
      { work_id: "w3", party_name: "Publisher", conflict_note: "IPI" },
    ];
    expect(countConflictGroups(rows, isDismissed)).toBe(1);
    expect(countConflictGroups(rows.slice(0, 1), isDismissed)).toBe(0);
  });
});