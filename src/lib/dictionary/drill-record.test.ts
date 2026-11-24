import { describe, expect, it } from "vitest";
import type { CardState } from "@/lib/kana/srs";
import { drillRecordOf } from "./drill-record";

const card = (reps: number, lapses: number): CardState => ({
  box: 1,
  due: 0,
  lapses,
  reps,
  lastSeen: 0,
  lastCorrect: true,
});

describe("drillRecordOf", () => {
  const skills = {
    "verb:te:godan": card(5, 1),
    "verb:past:godan": card(3, 2),
    "verb:te:ichidan": card(9, 9),
    "adj:plain:i": card(4, 0),
  };

  it("낱말이 드는 활용 갈래의 기록만 더한다", () => {
    expect(drillRecordOf(skills, { kind: "verb", group: "godan" })).toEqual({
      label: "1그룹 동사",
      reps: 8,
      lapses: 3,
    });
    expect(drillRecordOf(skills, { kind: "adj", adjKind: "i" }).reps).toBe(4);
  });

  it("기록이 없는 갈래는 0", () => {
    expect(drillRecordOf(skills, { kind: "adj", adjKind: "na" }).reps).toBe(0);
  });
});
