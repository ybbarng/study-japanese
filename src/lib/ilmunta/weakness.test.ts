import { describe, expect, it } from "vitest";
import { type CardState, DAY, MINUTE } from "@/lib/kana/srs";
import { SKILL_BY_KEY, type Skill } from "./curriculum";
import { seededRng } from "./random";
import { errorRate, pickSkill, weakestSkills } from "./weakness";

const NOW = Date.UTC(2027, 3, 1, 9);
const skill = (key: string): Skill => {
  const s = SKILL_BY_KEY.get(key);
  if (!s) throw new Error(key);
  return s;
};
const card = (over: Partial<CardState>): CardState => ({
  box: 1,
  due: NOW + DAY,
  lapses: 0,
  reps: 1,
  lastSeen: NOW - MINUTE,
  lastCorrect: true,
  ...over,
});

const teGodan = skill("verb:te:godan");
const naiGodan = skill("verb:nai:godan");
const masuGodan = skill("verb:masu:godan");

describe("pickSkill", () => {
  it("복습할 때가 된 기술을 먼저 고른다", () => {
    const states = {
      [naiGodan.key]: card({}),
      [teGodan.key]: card({ due: NOW - MINUTE }),
    };
    expect(
      pickSkill([naiGodan, teGodan, masuGodan], states, NOW, seededRng(1)).key,
    ).toBe(teGodan.key);
  });

  it("때가 된 것이 없으면 안 본 기술을 과 순서대로 고른다", () => {
    const states = { [naiGodan.key]: card({}) };
    expect(
      pickSkill([teGodan, masuGodan, naiGodan], states, NOW, seededRng(1)).key,
    ).toBe(masuGodan.key);
  });

  it("바로 앞 기술은 다른 고를 것이 있으면 피한다", () => {
    const states = {
      [naiGodan.key]: card({ due: NOW - MINUTE, lastCorrect: false }),
      [teGodan.key]: card({ due: NOW - MINUTE }),
    };
    expect(
      pickSkill([naiGodan, teGodan], states, NOW, seededRng(1), naiGodan.key)
        .key,
    ).toBe(teGodan.key);
  });

  it("모두 본 뒤에는 많이 틀린 기술이 더 자주 나온다", () => {
    const states = {
      [naiGodan.key]: card({ reps: 20, lapses: 15 }),
      [teGodan.key]: card({ reps: 20, lapses: 0 }),
    };
    const rng = seededRng(7);
    let weak = 0;
    for (let i = 0; i < 1000; i++)
      if (pickSkill([naiGodan, teGodan], states, NOW, rng).key === naiGodan.key)
        weak++;
    expect(weak).toBeGreaterThan(700);
  });
});

describe("errorRate·weakestSkills", () => {
  it("본 적 없으면 틀린 비율은 0이다", () => {
    expect(errorRate(undefined)).toBe(0);
  });

  it("틀린 비율이 높은 차례로 고르고, 틀린 적 없는 기술은 빼다", () => {
    const states = {
      [naiGodan.key]: card({ reps: 4, lapses: 1 }),
      [teGodan.key]: card({ reps: 4, lapses: 3 }),
      [masuGodan.key]: card({ reps: 9, lapses: 0 }),
    };
    expect(
      weakestSkills([naiGodan, teGodan, masuGodan], states).map(
        (w) => w.skill.key,
      ),
    ).toEqual([teGodan.key, naiGodan.key]);
  });
});
