import { describe, expect, it } from "vitest";
import { DRILL_LESSONS } from "@/lib/ilmunta/curriculum";
import { seededRng } from "@/lib/ilmunta/random";
import { rubyPlain } from "@/lib/ilmunta/ruby-text";
import { drillQuizQuestions } from "./drill";

const NOW = Date.UTC(2027, 1, 1, 9);

describe("drillQuizQuestions", () => {
  it("활용이 있는 과마다 서로 다른 문제를 2~3개 내고, 정답 보기가 보기 안에 있다", () => {
    for (const lesson of DRILL_LESSONS) {
      const { questions, skillOf } = drillQuizQuestions(
        lesson,
        {},
        seededRng(lesson),
        NOW,
      );
      expect(questions.length, `${lesson}과`).toBeGreaterThanOrEqual(2);
      expect(new Set(questions.map((q) => q.key)).size).toBe(questions.length);
      for (const q of questions) {
        expect(q.options[q.answer]).toBeDefined();
        expect(skillOf.get(q.key)).toBeTruthy();
      }
    }
  });

  it("문장 빈칸 문제는 빈칸에 정답을 채운 글을 정답 문장으로 보인다", () => {
    const lesson = DRILL_LESSONS[DRILL_LESSONS.length - 1];
    const { questions } = drillQuizQuestions(lesson, {}, seededRng(3), NOW);
    const blank = questions.find((q) => q.prompt.kind === "blank");
    if (blank?.prompt.kind !== "blank") return;
    expect(blank.reveal?.ja).toBe(
      rubyPlain(blank.prompt.before) +
        blank.options[blank.answer].label +
        rubyPlain(blank.prompt.after),
    );
  });

  it("활용을 다루지 않는 과는 문제를 내지 않는다", () => {
    const none = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].find(
      (n) => !DRILL_LESSONS.includes(n),
    );
    if (none === undefined) return;
    expect(drillQuizQuestions(none, {}, seededRng(1), NOW).questions).toEqual(
      [],
    );
  });
});
