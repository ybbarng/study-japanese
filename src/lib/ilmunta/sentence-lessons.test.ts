import { describe, expect, it } from "vitest";
import { DRILL_LESSONS, type Skill, skillsInLessons } from "./curriculum";
import { learnedBy, wordOf } from "./question";
import { seededRng } from "./random";
import { framesFor, makeDrillQuestion, type QuestionStyle } from "./sentence";
import { VERB_BY_DICT } from "./verbs";
import { ADJECTIVES } from "./words";

/** 드릴 낱말(동사·형용사·명사)이 쓰이기 시작하는 과. 드릴 낱말이 아니면(자타동사 짝·경어) undefined */
const LESSON_OF = new Map<string, number>([
  ...[...VERB_BY_DICT.values()].map((v) => [v.dict, v.lesson ?? 0] as const),
  ...ADJECTIVES.map((a) => [a.dict, a.lesson ?? 0] as const),
]);

/** 드릴처럼 앞 문제 낱말을 넘기며 문제를 잇달아 낸다 */
function chain(skill: Skill, style: QuestionStyle, upTo: number, n: number) {
  const rng = seededRng(upTo * 1000 + n);
  const words: string[] = [];
  let prev: string | undefined;
  for (let i = 0; i < n; i++) {
    const q = makeDrillQuestion(skill, style, rng, prev, upTo);
    prev = wordOf(q.id);
    words.push(prev);
  }
  return words;
}

describe("강별로 배운 낱말만 낸다", () => {
  it("어느 과 범위에서든 그 과까지 배운 낱말만 나온다(문장·활용표 둘 다)", () => {
    const early: string[] = [];
    for (const upTo of DRILL_LESSONS)
      for (const skill of skillsInLessons(1, upTo))
        for (const style of ["sentence", "table"] as const)
          for (const word of chain(skill, style, upTo, 15)) {
            const lesson = LESSON_OF.get(word);
            if (lesson != null && lesson > upTo)
              early.push(
                `${upTo}과 ${skill.key} ${style}: ${word}(${lesson}과)`,
              );
          }
    expect(early).toEqual([]);
  });

  it("문장 틀은 그 과까지 배운 낱말만 받고, 넣을 낱말이 없는 틀은 그 과에서 내지 않는다", () => {
    const count = (fs: ReturnType<typeof framesFor>) =>
      fs.reduce((n, f) => n + f.words.length, 0);
    let dropped = 0;
    for (const upTo of DRILL_LESSONS)
      for (const skill of skillsInLessons(1, upTo)) {
        const limited = framesFor(skill, upTo);
        for (const { words } of limited) {
          expect(words.length).toBeGreaterThan(0);
          const late = words.filter(
            (w) => !learnedBy(w.verb ?? w.adj ?? {}, upTo),
          );
          expect(late).toEqual([]);
        }
        dropped += count(framesFor(skill)) - count(limited);
      }
    // 앞 과에서 빠지는 낱말이 실제로 있다(걸러 내기가 일하고 있다)
    expect(dropped).toBeGreaterThan(0);
  });

  it("8과(1그룹 보통체)에서는 15과에 처음 나오는 走る가 빈칸에 들어가지 않고, 15과부터는 들어간다", () => {
    const skill = skillsInLessons(8, 8).find((s) => s.key === "verb:nai:godan");
    if (!skill) throw new Error("verb:nai:godan 없음");
    const dicts = (upTo: number) =>
      framesFor(skill, upTo).flatMap((f) => f.words.map((w) => w.word.dict));
    expect(VERB_BY_DICT.get("走る")?.lesson).toBe(15);
    expect(dicts(8)).not.toContain("走る");
    expect(dicts(15)).toContain("走る");
  });
});

describe("같은 낱말이 잇달아 나오지 않는다", () => {
  it("배운 낱말이 둘 이상인 기술은 앞 문제와 같은 낱말을 내지 않는다(문장 방식)", () => {
    const repeats: string[] = [];
    for (const upTo of DRILL_LESSONS)
      for (const skill of skillsInLessons(1, upTo)) {
        const distinct = new Set(
          framesFor(skill, upTo).flatMap((f) =>
            f.words.map((w) => w.word.dict),
          ),
        );
        if (distinct.size < 2) continue;
        const words = chain(skill, "sentence", upTo, 20);
        for (let i = 1; i < words.length; i++)
          if (words[i] === words[i - 1])
            repeats.push(`${upTo}과 ${skill.key}: ${words[i]}`);
      }
    expect(repeats).toEqual([]);
  });
});
