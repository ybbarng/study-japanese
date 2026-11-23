import { BASIC, type CardId, cardId, parseCardId, type Script } from "./data";
import { LESSONS, lessonCards } from "./lessons";
import { type Rng, shuffle } from "./quiz";

export type RushMode = Script | "mix";

/**
 * 게임에 낼 글자 묶음. 배운 글자를 쓰고, 모자라면 그 글자 종류의 첫 레슨 글자로 채운다
 * (아직 아무것도 안 배웠어도 게임은 돈다).
 */
export function gamePool(
  learned: readonly CardId[],
  mode: RushMode,
  minSize = 8,
): CardId[] {
  const scripts: Script[] = mode === "mix" ? ["hira", "kata"] : [mode];
  const out = learned.filter((c) => scripts.includes(parseCardId(c).script));
  // 글자 종류마다 몫을 나눠 채운다(섞기에서 한쪽만 나오지 않게)
  const share = Math.ceil(minSize / scripts.length);
  for (const script of scripts) {
    const first = LESSONS.find((l) => l.script === script);
    if (!first) continue;
    const count = () =>
      out.filter((c) => parseCardId(c).script === script).length;
    for (const c of lessonCards(first)) {
      if (count() >= share) break;
      if (!out.includes(c)) out.push(c);
    }
  }
  return out;
}

/** 빠르게 읽기: 연속 맞힘이 쌓일수록 한 문제에 1점씩 더(5연속마다) */
export function rushPoints(combo: number): number {
  return 1 + Math.floor(combo / 5);
}

/** 빠르게 읽기: 글자가 떨어지는 시간(ms). 연속으로 맞힐수록 빨라지고 1.4초보다 빠르지 않다. */
export function rushFallMs(combo: number): number {
  return Math.max(1400, 4000 - combo * 150);
}

/**
 * 짝 맞추기: 히라가나·가타카나 둘 다 배운 기본 글자에서 `count`쌍. 모자라면 기본 글자에서 채운다.
 * 같은 행이 몰리지 않게 섞어서 고른다.
 */
export function pickPairs(
  learned: ReadonlySet<CardId>,
  count: number,
  rng: Rng,
): string[] {
  const both = BASIC.filter(
    (s) =>
      learned.has(cardId("hira", s.id)) && learned.has(cardId("kata", s.id)),
  ).map((s) => s.id);
  const picked = shuffle(both, rng).slice(0, count);
  if (picked.length < count) {
    const rest = shuffle(
      BASIC.map((s) => s.id).filter((id) => !picked.includes(id)),
      rng,
    );
    picked.push(...rest.slice(0, count - picked.length));
  }
  return picked;
}
