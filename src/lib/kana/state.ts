import { z } from "zod";
import { ALL_CARD_IDS, type CardId } from "./data";
import { type CardState, newCard, review } from "./srs";

/**
 * 가나 학습 상태 전체. 서버 동기화는 이 JSON 하나를 주고받는 것으로 붙인다.
 * `updatedAt`은 마지막으로 바뀐 시각(ms)이라 두 쪽 중 새것을 고를 때 쓴다.
 */
export interface KanaData {
  version: 1;
  updatedAt: number;
  cards: Partial<Record<CardId, CardState>>;
  /** 끝낸 레슨 id → 끝낸 시각 */
  lessons: Record<string, number>;
  /** 게임 id → 최고 기록 */
  bests: Record<string, number>;
  /** 공부한 날(YYYY-MM-DD, 기기 시간대). 최근 120일만 둔다. */
  days: string[];
}

export function emptyKanaData(now = 0): KanaData {
  return {
    version: 1,
    updatedAt: now,
    cards: {},
    lessons: {},
    bests: {},
    days: [],
  };
}

export function dayKey(now: number): string {
  const d = new Date(now);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function touch(data: KanaData, now: number): KanaData {
  const today = dayKey(now);
  const days = data.days.includes(today)
    ? data.days
    : [...data.days, today].slice(-120);
  return { ...data, updatedAt: now, days };
}

/** 글자를 배우기 시작한다(이미 있는 카드는 그대로). */
export function introduce(
  data: KanaData,
  ids: readonly CardId[],
  now: number,
): KanaData {
  const cards = { ...data.cards };
  for (const id of ids) if (!cards[id]) cards[id] = newCard(now);
  return touch({ ...data, cards }, now);
}

/** 문제에 답했다. 없는 카드면 새로 만들고 답을 적는다. */
export function answer(
  data: KanaData,
  id: CardId,
  correct: boolean,
  now: number,
): KanaData {
  const card = data.cards[id] ?? newCard(now);
  return touch(
    { ...data, cards: { ...data.cards, [id]: review(card, correct, now) } },
    now,
  );
}

export function completeLesson(
  data: KanaData,
  lessonId: string,
  now: number,
): KanaData {
  if (data.lessons[lessonId]) return touch(data, now);
  return touch({ ...data, lessons: { ...data.lessons, [lessonId]: now } }, now);
}

/** 최고 기록. `higherIsBetter`가 거짓이면(걸린 시간 등) 작을수록 좋다. */
export function recordBest(
  data: KanaData,
  gameId: string,
  score: number,
  now: number,
  higherIsBetter = true,
): { data: KanaData; isNew: boolean } {
  const prev = data.bests[gameId];
  const isNew =
    prev === undefined || (higherIsBetter ? score > prev : score < prev);
  if (!isNew) return { data: touch(data, now), isNew };
  return {
    data: touch({ ...data, bests: { ...data.bests, [gameId]: score } }, now),
    isNew,
  };
}

/** 오늘까지 이어서 공부한 날 수(오늘 안 했으면 어제까지). */
export function streak(data: KanaData, now: number): number {
  const set = new Set(data.days);
  let n = 0;
  let t = now;
  if (!set.has(dayKey(t))) t -= 86_400_000;
  while (set.has(dayKey(t))) {
    n += 1;
    t -= 86_400_000;
  }
  return n;
}

// ─── 내보내기·들여오기 ──────────────────────────────────

const cardIdSet = new Set<string>(ALL_CARD_IDS);

const cardStateSchema = z.object({
  box: z.number().int().min(0),
  due: z.number(),
  lapses: z.number().int().min(0),
  reps: z.number().int().min(0),
  lastSeen: z.number(),
  lastCorrect: z.boolean(),
});

const kanaDataSchema = z.object({
  version: z.literal(1),
  updatedAt: z.number(),
  cards: z.record(z.string(), cardStateSchema),
  lessons: z.record(z.string(), z.number()),
  bests: z.record(z.string(), z.number()),
  days: z.array(z.string()),
});

export function serializeKanaData(data: KanaData): string {
  const { version, updatedAt, cards, lessons, bests, days } = data;
  return JSON.stringify({ version, updatedAt, cards, lessons, bests, days });
}

/** JSON을 읽어 상태로. 모양이 틀리면 오류를 던진다. 모르는 카드 id는 버린다. */
export function parseKanaData(json: string): KanaData {
  const parsed = kanaDataSchema.parse(JSON.parse(json));
  const cards: Partial<Record<CardId, CardState>> = {};
  for (const [k, v] of Object.entries(parsed.cards)) {
    if (cardIdSet.has(k)) cards[k as CardId] = v;
  }
  return { ...parsed, cards };
}
