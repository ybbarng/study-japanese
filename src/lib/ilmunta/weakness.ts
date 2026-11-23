import { type CardState, dueQueue } from "@/lib/kana/srs";
import { firstLesson, type Skill } from "./curriculum";
import type { Rng } from "./random";

/**
 * 활용형 × 갈래(기술)마다 약점을 따라간다. 간격 반복 계산은 가나 카드와 같은 상자 방식을 쓴다
 * (`@/lib/kana/srs`). 시간은 언제나 인자로 받는다.
 */

/** 틀린 비율(본 적 없으면 0). 처음 몇 번은 덜 믿도록 앞에 1·2를 더한다 */
export function errorRate(card: CardState | undefined): number {
  if (!card || card.reps === 0) return 0;
  return (card.lapses + 1) / (card.reps + 2);
}

/**
 * 다음에 물을 기술을 고른다.
 * 1) 복습할 때가 된 기술(마지막에 틀린 것부터)
 * 2) 아직 안 본 기술(과 순서대로)
 * 3) 틀린 비율이 높을수록 자주 나오게 무게를 두어 뽑기
 * 바로 앞 기술(`lastKey`)은 다른 고를 것이 있으면 피한다.
 */
export function pickSkill(
  skills: readonly Skill[],
  states: Readonly<Record<string, CardState>>,
  now: number,
  rng: Rng,
  lastKey?: string,
): Skill {
  if (skills.length === 0) throw new Error("고를 기술이 없음");
  const usable =
    skills.length > 1 ? skills.filter((s) => s.key !== lastKey) : skills;
  const byKey = new Map(usable.map((s) => [s.key, s]));

  const seen: Record<string, CardState> = {};
  for (const s of usable) if (states[s.key]) seen[s.key] = states[s.key];
  const due = dueQueue(seen, now, 1);
  if (due.length > 0) return byKey.get(due[0]) as Skill;

  const unseen = usable
    .filter((s) => !states[s.key])
    .sort((a, b) => firstLesson(a) - firstLesson(b));
  if (unseen.length > 0) return unseen[0];

  const weights = usable.map((s) => 0.1 + errorRate(states[s.key]));
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rng() * total;
  for (let i = 0; i < usable.length; i++) {
    r -= weights[i];
    if (r < 0) return usable[i];
  }
  return usable[usable.length - 1];
}

/** 약한 기술: 두 번 넘게 보았고 틀린 비율이 높은 차례로 */
export function weakestSkills(
  skills: readonly Skill[],
  states: Readonly<Record<string, CardState>>,
  limit = 5,
): { skill: Skill; rate: number }[] {
  return skills
    .filter(
      (s) =>
        (states[s.key]?.reps ?? 0) >= 2 && (states[s.key]?.lapses ?? 0) > 0,
    )
    .map((skill) => ({ skill, rate: errorRate(states[skill.key]) }))
    .sort((a, b) => b.rate - a.rate || (a.skill.key < b.skill.key ? -1 : 1))
    .slice(0, limit);
}
