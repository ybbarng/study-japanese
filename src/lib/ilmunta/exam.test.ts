import { describe, expect, it } from "vitest";
import { SKILL_BY_KEY } from "./curriculum";
import { buildExam, examLessons, scoreExam } from "./exam";
import { monthOfLesson, monthRange } from "./months";
import { seededRng } from "./random";

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
