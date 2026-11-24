import type { CardState } from "@/lib/kana/srs";

// 기기에 남기고 서버와 주고받는 복습 상태(가나·확인 문제·일문따 드릴)의 모양 확인.
// zod 대신 손으로 본다: 이 상태들은 첫 화면·강 화면에서 읽혀서, zod(압축해 약 30KB)가
// 그 화면들의 JS에 딸려 가지 않게 한다.

export function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export const isNumber = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v);

/** 0 이상의 정수 */
export const isCount = (v: unknown): v is number =>
  isNumber(v) && Number.isInteger(v) && v >= 0;

export const isStringArray = (v: unknown): v is string[] =>
  Array.isArray(v) && v.every((s) => typeof s === "string");

/** 복습 카드 하나. 모양이 틀리면 null. 모르는 필드는 버린다 */
export function readSrsCard(v: unknown): CardState | null {
  if (
    !isRecord(v) ||
    !isCount(v.box) ||
    !isNumber(v.due) ||
    !isCount(v.lapses) ||
    !isCount(v.reps) ||
    !isNumber(v.lastSeen) ||
    typeof v.lastCorrect !== "boolean"
  )
    return null;
  return {
    box: v.box,
    due: v.due,
    lapses: v.lapses,
    reps: v.reps,
    lastSeen: v.lastSeen,
    lastCorrect: v.lastCorrect,
  };
}

/** id → 복습 카드. 하나라도 모양이 틀리면 null */
export function readSrsCards(v: unknown): Record<string, CardState> | null {
  if (!isRecord(v)) return null;
  const out: Record<string, CardState> = {};
  for (const [k, raw] of Object.entries(v)) {
    const card = readSrsCard(raw);
    if (!card) return null;
    out[k] = card;
  }
  return out;
}
