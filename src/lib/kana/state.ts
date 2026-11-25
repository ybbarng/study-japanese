import {
  isNumber,
  isRecord,
  isStringArray,
  readSrsCard,
} from "@/lib/srs-shape";
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
  /** 써 보기 연습 기록. 카드 id → 기록 */
  writes: Partial<Record<CardId, WriteRecord>>;
}

/** 써 보기에서 한 글자를 다 쓴 기록 */
export interface WriteRecord {
  /** 다 쓴 횟수(단계와 상관없이) */
  done: number;
  /** 빈 칸에 혼자, 한 번도 틀리지 않고 쓴 횟수 */
  solo: number;
  /** 마지막으로 쓴 시각(ms) */
  last: number;
}

export function emptyKanaData(now = 0): KanaData {
  return {
    version: 1,
    updatedAt: now,
    cards: {},
    lessons: {},
    bests: {},
    days: [],
    writes: {},
  };
}

/** 써 보기에서 글자 하나를 다 썼다. `solo`는 빈 칸에 혼자 틀림 없이 썼는지 */
export function recordWrite(
  data: KanaData,
  id: CardId,
  solo: boolean,
  now: number,
): KanaData {
  const prev = data.writes[id] ?? { done: 0, solo: 0, last: 0 };
  const next: WriteRecord = {
    done: prev.done + 1,
    solo: prev.solo + (solo ? 1 : 0),
    last: now,
  };
  return touch({ ...data, writes: { ...data.writes, [id]: next } }, now);
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

// 모양 확인은 zod 없이 손으로 한다(가나 상태는 모든 화면의 아래 막대가 읽는다, srs-shape.ts).

class KanaShapeError extends Error {
  constructor(where: string) {
    super(`가나 상태 모양이 틀립니다: ${where}`);
    this.name = "KanaShapeError";
  }
}

function readCard(v: unknown, id: string): CardState {
  const card = readSrsCard(v);
  if (!card) throw new KanaShapeError(`cards.${id}`);
  return card;
}

function readNumbers(v: unknown, where: string): Record<string, number> {
  if (!isRecord(v)) throw new KanaShapeError(where);
  const out: Record<string, number> = {};
  for (const [k, n] of Object.entries(v)) {
    if (!isNumber(n)) throw new KanaShapeError(`${where}.${k}`);
    out[k] = n;
  }
  return out;
}

function readWrites(v: unknown): Partial<Record<CardId, WriteRecord>> {
  // 써 보기가 생기기 전에 저장한 상태에는 없다
  if (v === undefined) return {};
  if (!isRecord(v)) throw new KanaShapeError("writes");
  const out: Partial<Record<CardId, WriteRecord>> = {};
  for (const [k, r] of Object.entries(v)) {
    if (
      !isRecord(r) ||
      !isNumber(r.done) ||
      !isNumber(r.solo) ||
      !isNumber(r.last)
    )
      throw new KanaShapeError(`writes.${k}`);
    if (cardIdSet.has(k))
      out[k as CardId] = { done: r.done, solo: r.solo, last: r.last };
  }
  return out;
}

export function serializeKanaData(data: KanaData): string {
  const { version, updatedAt, cards, lessons, bests, days, writes } = data;
  return JSON.stringify({
    version,
    updatedAt,
    cards,
    lessons,
    bests,
    days,
    writes,
  });
}

/** JSON을 읽어 상태로. 모양이 틀리면 오류를 던진다. 모르는 카드 id는 버린다. */
export function parseKanaData(json: string): KanaData {
  const raw: unknown = JSON.parse(json);
  if (!isRecord(raw) || raw.version !== 1) throw new KanaShapeError("version");
  if (!isNumber(raw.updatedAt)) throw new KanaShapeError("updatedAt");
  if (!isRecord(raw.cards)) throw new KanaShapeError("cards");
  if (!isStringArray(raw.days)) throw new KanaShapeError("days");
  const cards: Partial<Record<CardId, CardState>> = {};
  for (const [k, v] of Object.entries(raw.cards)) {
    const card = readCard(v, k);
    if (cardIdSet.has(k)) cards[k as CardId] = card;
  }
  return {
    version: 1,
    updatedAt: raw.updatedAt,
    cards,
    lessons: readNumbers(raw.lessons, "lessons"),
    bests: readNumbers(raw.bests, "bests"),
    days: raw.days,
    writes: readWrites(raw.writes),
  };
}
