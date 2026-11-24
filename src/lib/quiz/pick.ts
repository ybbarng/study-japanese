import { type Rng, shuffle } from "@/lib/ilmunta/random";
import type { ChoiceOption, ChoiceQuestion, Question } from "./types";

// 보기 고르기와 구역 문제 묶기. 어느 구역이든 같은 규칙을 쓴다.

/**
 * 후보에서 틀린 보기를 n개까지 고른다. `fits(후보, 이미 고른 것)`이 참인 것만.
 * 후보 묶음은 앞에 둔 것부터 쓴다(같은 강 낱말을 먼저, 모자라면 앞 강 낱말)
 */
export function takeDistractors<T>(
  groups: readonly (readonly T[])[],
  fits: (c: T, chosen: readonly T[]) => boolean,
  n: number,
  rng: Rng,
): T[] {
  const chosen: T[] = [];
  for (const g of groups)
    for (const c of shuffle(g, rng)) {
      if (chosen.length >= n) return chosen;
      if (fits(c, chosen)) chosen.push(c);
    }
  return chosen;
}

/** 정답과 틀린 보기를 섞어 문제의 보기와 정답 차례로 */
export function arrange(
  correct: ChoiceOption,
  wrong: readonly ChoiceOption[],
  rng: Rng,
): { options: ChoiceOption[]; answer: number } {
  const options = shuffle([correct, ...wrong], rng);
  return { options, answer: options.indexOf(correct) };
}

/** 보기가 이만큼은 있어야 문제로 낸다(정답 포함) */
export const MIN_OPTIONS = 3;
export const MAX_OPTIONS = 4;

export function enoughOptions(q: ChoiceQuestion): boolean {
  return q.options.length >= MIN_OPTIONS;
}

/** 한 구역에서 낼 문제 수 */
export const QUESTIONS_PER_SECTION = 3;

/** 문제 하나를 만드는 법: 대상(낱말·문장)을 받아 문제를 만들거나, 못 만들면 null */
export interface Maker<T> {
  /** 이 대상으로 만들 문제의 열쇠(만들기 전에 알아야 복습할 문제를 먼저 고른다) */
  keyOf: (target: T) => string;
  make: (target: T) => Question | null;
}

/**
 * 구역 문제를 묶는다. 복습할 때가 된 문제(prefer)를 먼저 내고, 나머지는 만드는 법을 돌아가며
 * 서로 다른 대상으로 채운다(같은 낱말을 두 번 묻지 않게).
 */
export function assemble<T>(
  targets: readonly T[],
  makers: readonly Maker<T>[],
  idOf: (target: T) => string,
  rng: Rng,
  prefer: ReadonlySet<string> = new Set(),
  count = QUESTIONS_PER_SECTION,
): Question[] {
  const out: Question[] = [];
  const used = new Set<string>();
  const shuffled = shuffle(targets, rng);
  for (const t of shuffled)
    for (const m of makers) {
      if (out.length >= count) return out;
      if (used.has(idOf(t)) || !prefer.has(m.keyOf(t))) continue;
      const q = m.make(t);
      if (q) {
        out.push(q);
        used.add(idOf(t));
      }
    }
  let progress = true;
  while (out.length < count && progress) {
    progress = false;
    for (const m of makers) {
      if (out.length >= count) break;
      for (const t of shuffled) {
        if (used.has(idOf(t))) continue;
        const q = m.make(t);
        if (!q) continue;
        out.push(q);
        used.add(idOf(t));
        progress = true;
        break;
      }
    }
  }
  return out;
}
