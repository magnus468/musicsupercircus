import { expect, it } from "vitest";
import { visibleUnmatchedWorks } from "./visibleUnmatchedWorks";

it("hides a returned Sven Wunder work without hiding other Danell works or retained co-written works", () => {
  const works = [
    { work_title: "ALLA PRIMA", composers: "DANELL" },
    { work_title: "1 FEBRUARI", composers: "DANELL" },
    { work_title: "BLACK IRIS", composers: "TENGBLAD | DANELL" },
  ];
  expect(visibleUnmatchedWorks(works, (section, key) => section === "unmatched_settlements" && key === "ALLA PRIMA")).toEqual(works.slice(1));
});