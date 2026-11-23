import { describe, expect, it } from "vitest";
import { SKILL_BY_KEY } from "./curriculum";
import { buildExam, examLessons, scoreExam } from "./exam";
import { monthOfLesson, monthRange } from "./months";
import { wordOf } from "./question";
import { seededRng } from "./random";
import { VERB_BY_DICT } from "./verbs";
import { ADJECTIVES } from "./words";

const april = monthRange(4);
const may = monthRange(5);
const june = monthRange(6);
if (!april || !may || !june) throw new Error("달 범위가 없음");

describe("buildExam", () => {
  it.each([april, may, june])("%o: 30문제를 겹치지 않게 만든다", (range) => {
    const exam = buildExam(range, seededRng(11));
    expect(exam).toHaveLength(30);
    expect(new Set(exam.map((q) => q.id)).size).toBe(30);
  });

  it("그 달 범위 밖의 과에서는 내지 않는다", () => {
    const exam = buildExam(may, seededRng(3));
    for (const q of exam) {
      const lessons = SKILL_BY_KEY.get(q.skillKey)?.lessons ?? [];
      expect(lessons.some((l) => l >= 25 && l <= 41)).toBe(true);
    }
  });

  it("4월 시험은 범위 안 모든 과에서 한 문제 이상 낸다", () => {
    const exam = buildExam(april, seededRng(5));
    const covered = new Set(
      exam.flatMap((q) => SKILL_BY_KEY.get(q.skillKey)?.lessons ?? []),
    );
    for (const l of examLessons(april)) expect(covered.has(l)).toBe(true);
  });

  it("입력 문제와 고르기 문제를 번갈아 둔다", () => {
    const modes = buildExam(june, seededRng(1))
      .slice(0, 4)
      .map((q) => q.mode);
    expect(modes).toEqual(["input", "choice", "input", "choice"]);
  });

  it("같은 씨앗이면 같은 시험지다", () => {
    expect(buildExam(april, seededRng(9))).toEqual(
      buildExam(april, seededRng(9)),
    );
  });
});

describe("buildExam 낱말 범위", () => {
  /** 드릴 낱말(동사·형용사·명사)이 쓰이기 시작하는 과. 자타동사 짝·경어는 없음 */
  const LESSON_OF = new Map<string, number>([
    ...[...VERB_BY_DICT.values()].map((v) => [v.dict, v.lesson ?? 0] as const),
    ...ADJECTIVES.map((a) => [a.dict, a.lesson ?? 0] as const),
  ]);
  const SEEDS = Array.from({ length: 20 }, (_, i) => i + 1);

  it.each([april, may, june])(
    "%o: 그 달 마지막 과까지 배운 낱말만 낸다",
    (range) => {
      const late: string[] = [];
      for (const seed of SEEDS)
        for (const q of buildExam(range, seededRng(seed))) {
          const word = wordOf(q.id);
          const lesson = LESSON_OF.get(word);
          if (lesson != null && lesson > range.to)
            late.push(`${seed}: ${word}(${lesson}과)`);
        }
      expect(late).toEqual([]);
    },
  );

  it("4월 시험(1~24과)에는 25과에 처음 나오는 遅れる가 나오지 않고, 5월 시험에는 나온다", () => {
    const words = (range: typeof april) =>
      new Set(
        SEEDS.flatMap((seed) =>
          buildExam(range, seededRng(seed)).map((q) => wordOf(q.id)),
        ),
      );
    expect(VERB_BY_DICT.get("遅れる")?.lesson).toBe(25);
    expect(words(april).has("遅れる")).toBe(false);
    expect(words(may).has("遅れる")).toBe(true);
  });

  it("일무따에 나온 낱말은 일문따 과와 상관없이 4월 시험에도 나온다", () => {
    // 考える는 일문따 28과에 나오지만 일무따에 먼저 나와 처음부터 쓴다
    expect(VERB_BY_DICT.get("考える")?.lesson).toBe(0);
    const words = new Set(
      SEEDS.flatMap((seed) =>
        buildExam(april, seededRng(seed)).map((q) => wordOf(q.id)),
      ),
    );
    expect(words.has("考える")).toBe(true);
  });

  it.each([april, may, june])(
    "%o: 바로 앞 문제와 같은 낱말을 잇달아 내지 않는다",
    (range) => {
      const repeats: string[] = [];
      for (const seed of SEEDS) {
        const words = buildExam(range, seededRng(seed)).map((q) =>
          wordOf(q.id),
        );
        for (let i = 1; i < words.length; i++)
          if (words[i] === words[i - 1])
            repeats.push(`${seed}: ${i}번 ${words[i]}`);
      }
      expect(repeats).toEqual([]);
    },
  );
});

describe("examLessons", () => {
  it("5월 범위에서 활용으로 만들 수 있는 과만 다룬다", () => {
    expect(examLessons(may)).toEqual([25, 35, 36, 37, 38, 40]);
  });
});

describe("scoreExam", () => {
  it("27/30은 90점이고 합격이다", () => {
    const r = scoreExam([...Array(27).fill(true), ...Array(3).fill(false)]);
    expect(r).toEqual({ correct: 27, total: 30, score: 90, passed: true });
  });

  it("26/30은 87점이고 불합격이다", () => {
    const r = scoreExam([...Array(26).fill(true), ...Array(4).fill(false)]);
    expect(r).toEqual({ correct: 26, total: 30, score: 87, passed: false });
  });
});

describe("monthOfLesson", () => {
  it("과 번호로 달 범위를 찾는다", () => {
    expect(monthOfLesson(24)?.month).toBe(4);
    expect(monthOfLesson(25)?.month).toBe(5);
    expect(monthOfLesson(56)?.month).toBe(6);
    expect(monthOfLesson(57)).toBeNull();
  });
});
