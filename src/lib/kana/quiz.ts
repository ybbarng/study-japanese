import {
  ALL_CARD_IDS,
  type CardId,
  confusablesOf,
  parseCardId,
  sameSound,
} from "./data";

/** 0 이상 1 미만을 돌려주는 난수 함수. 시험에서는 씨앗을 고정한 것을 넣는다. */
export type Rng = () => number;

/** 씨앗을 넣으면 늘 같은 순서를 내는 난수(mulberry32) */
export function seededRng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export type QuestionKind = "sound-to-char" | "char-to-sound";

export interface Question {
  kind: QuestionKind;
  answer: CardId;
  /** 보기 4개(답 포함, 섞인 순서) */
  choices: CardId[];
}

/**
 * 오답 보기 고르기: 헷갈리는 짝 → 같은 묶음(pool) → 같은 글자 종류 전체 순으로 채운다.
 * 같은 소리(じ/ぢ 등)와 다른 글자 종류(히라가나 문제에 가타카나)는 빼낸다.
 */
export function pickDistractors(
  answer: CardId,
  pool: readonly CardId[],
  rng: Rng,
  count = 3,
): CardId[] {
  const { script, soundId } = parseCardId(answer);
  const ok = (c: CardId) => {
    const p = parseCardId(c);
    return p.script === script && !sameSound(p.soundId, soundId);
  };
  const chosen: CardId[] = [];
  const add = (cands: CardId[]) => {
    for (const c of shuffle(cands, rng)) {
      if (chosen.length >= count) return;
      if (ok(c) && !chosen.includes(c)) {
        // 이미 고른 보기와 같은 소리도 빼서 보기끼리 겹치지 않게 한다
        if (
          chosen.some((x) =>
            sameSound(parseCardId(x).soundId, parseCardId(c).soundId),
          )
        )
          continue;
        chosen.push(c);
      }
    }
  };
  add(
    confusablesOf(answer)
      .filter((c) => pool.includes(c))
      .slice(0, 1),
  );
  add([...pool]);
  add(ALL_CARD_IDS.filter((c) => parseCardId(c).script === script));
  return chosen;
}

export function makeQuestion(
  answer: CardId,
  pool: readonly CardId[],
  kind: QuestionKind,
  rng: Rng,
): Question {
  const choices = shuffle([answer, ...pickDistractors(answer, pool, rng)], rng);
  return { kind, answer, choices };
}

/**
 * 묶음에서 문제 `count`개. 글자마다 두 종류를 고루 섞고, 같은 글자가 연달아 나오지 않게 한다.
 * `soundAvailable`이 거짓이면 소리 듣기 문제 대신 글자 보기 문제만 낸다.
 */
export function makeQuiz(
  pool: readonly CardId[],
  count: number,
  rng: Rng,
  soundAvailable = true,
): Question[] {
  if (pool.length === 0) return [];
  const order: CardId[] = [];
  while (order.length < count) {
    const round = shuffle(pool, rng);
    if (
      order.length > 0 &&
      round[0] === order[order.length - 1] &&
      round.length > 1
    )
      [round[0], round[1]] = [round[1], round[0]];
    order.push(...round);
  }
  return order
    .slice(0, count)
    .map((answer, i) =>
      makeQuestion(
        answer,
        pool,
        soundAvailable && i % 2 === 0 ? "sound-to-char" : "char-to-sound",
        rng,
      ),
    );
}
