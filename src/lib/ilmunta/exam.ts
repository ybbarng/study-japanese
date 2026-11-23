import { firstLesson, type Skill, skillsInLessons } from "./curriculum";
import { type MonthRange, PASS_SCORE } from "./months";
import { makeQuestion, type Question } from "./question";
import { type Rng, shuffle } from "./random";

/** 시험 문제: 입력해서 답하는 문제와 고르는 문제를 번갈아 둔다 */
export interface ExamQuestion extends Question {
  mode: "input" | "choice";
}

export const EXAM_SIZE = 30;

/** 기술을 과마다 묶어, 과를 차례로 돌며 하나씩 뽑는다(모든 과가 고르게 나오게) */
function spreadByLesson(
  skills: Skill[],
  from: number,
  rng: Rng,
  count: number,
): Skill[] {
  const byLesson = new Map<number, Skill[]>();
  for (const s of skills) {
    const inRange = s.lessons.filter((l) => l >= from).sort((a, b) => a - b);
    const lesson = inRange[0] ?? firstLesson(s);
    byLesson.set(lesson, [...(byLesson.get(lesson) ?? []), s]);
  }
  const lessons = [...byLesson.keys()].sort((a, b) => a - b);
  const queues = new Map(
    lessons.map((l) => [l, shuffle(byLesson.get(l) ?? [], rng)]),
  );
  const cursor = new Map(lessons.map((l) => [l, 0]));
  const out: Skill[] = [];
  while (out.length < count) {
    for (const l of lessons) {
      if (out.length >= count) break;
      const q = queues.get(l) ?? [];
      const i = cursor.get(l) ?? 0;
      out.push(q[i % q.length]);
      cursor.set(l, i + 1);
    }
  }
  return out;
}

/** 그 달 범위의 기술로 시험지를 만든다. 같은 문제(기술 + 낱말)는 두 번 내지 않는다 */
export function buildExam(
  range: MonthRange,
  rng: Rng,
  count = EXAM_SIZE,
): ExamQuestion[] {
  const skills = skillsInLessons(range.from, range.to);
  if (skills.length === 0) return [];
  const plan = spreadByLesson(skills, range.from, rng, count);
  const used = new Set<string>();
  const out: ExamQuestion[] = [];
  for (const skill of plan) {
    let q = makeQuestion(skill, rng);
    for (let tries = 0; used.has(q.id) && tries < 10; tries++)
      q = makeQuestion(skill, rng);
    if (used.has(q.id)) continue;
    used.add(q.id);
    out.push({ ...q, mode: out.length % 2 === 0 ? "input" : "choice" });
  }
  return out;
}

/** 이 범위에서 시험이 다루는 과(활용으로 만들 수 있는 과만) */
export function examLessons(range: MonthRange): number[] {
  return [
    ...new Set(
      skillsInLessons(range.from, range.to).flatMap((s) =>
        s.lessons.filter((l) => l >= range.from && l <= range.to),
      ),
    ),
  ].sort((a, b) => a - b);
}

export interface ExamScore {
  correct: number;
  total: number;
  /** 100점 만점, 반올림 */
  score: number;
  passed: boolean;
}

export function scoreExam(results: readonly boolean[]): ExamScore {
  const total = results.length;
  const correct = results.filter(Boolean).length;
  const score = total === 0 ? 0 : Math.round((correct / total) * 100);
  return { correct, total, score, passed: score >= PASS_SCORE };
}
