import { describe, expect, it } from "vitest";
import { DRILL_LESSONS } from "@/lib/ilmunta/curriculum";
import { seededRng } from "@/lib/ilmunta/random";
import {
  type DrillWord,
  drillWordQuestions,
  lessonWordTargets,
} from "./drill-words";

const w = (
  dict: string,
  reading: string,
  ko: string,
  ilmunta: number | null,
): DrillWord => ({ dict, reading, ko, ilmunta });

const WORDS: DrillWord[] = [
  w("静か", "しずか", "조용하다", 3),
  w("便利", "べんり", "편리하다", 3),
  w("好き", "すき", "좋아하다", 5),
  w("上手", "じょうず", "잘하다", 5),
  w("高い", "たかい", "높다", 6),
  w("学生", "がくせい", "학생", null),
  w("猫", "ねこ", "고양이", null),
];

describe("lessonWordTargets", () => {
  it("그 과 낱말이 모자라면 가까운 앞 과 낱말로 채우고, 뒤 과 낱말은 쓰지 않는다", () => {
    const got = lessonWordTargets(5, WORDS, 3).map((x) => x.dict);
    expect(got.slice(0, 2).sort()).toEqual(["上手", "好き"]);
    expect(got).toHaveLength(3);
    expect(["静か", "便利"]).toContain(got[2]);
    expect(got).not.toContain("高い");
  });
});

describe("drillWordQuestions", () => {
  it("뜻·읽는 법 문제의 정답은 그 낱말의 뜻·읽기이고, 보기에 뒤 과 낱말이 섞이지 않는다", () => {
    const qs = drillWordQuestions(5, seededRng(7), WORDS, 3);
    expect(qs).toHaveLength(3);
    for (const q of qs) {
      if (q.type !== "choice") throw new Error("고르기 문제가 아님");
      const p = q.prompt;
      if (p.kind !== "word") throw new Error("낱말 문제가 아님");
      const word = WORDS.find((x) => x.dict === p.word.ja);
      if (!word) throw new Error(`모르는 낱말 ${p.word.ja}`);
      const right = q.options[q.answer].label;
      expect(right).toBe(p.ask === "뜻은?" ? word.ko : word.reading);
      expect(q.options.map((o) => o.label)).not.toContain("높다");
      expect(q.key.startsWith("ilmunta5:w:")).toBe(true);
    }
  });

  it("활용을 다루지 않는 실제 과마다 서로 다른 문제를 3개 낸다", () => {
    const noDrill = Array.from({ length: 56 }, (_, i) => i + 1).filter(
      (n) => !DRILL_LESSONS.includes(n),
    );
    expect(noDrill).toContain(5);
    for (const lesson of noDrill) {
      const qs = drillWordQuestions(lesson, seededRng(lesson));
      expect(qs.length, `${lesson}과`).toBe(3);
      expect(new Set(qs.map((q) => q.key)).size).toBe(3);
    }
  });
});
