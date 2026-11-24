import { type CardState, newCard, review } from "@/lib/kana/srs";
import {
  isNumber,
  isRecord,
  isStringArray,
  readSrsCards,
} from "@/lib/srs-shape";
import type { Versioned } from "@/lib/sync/state-sync";

/** 서버 상태 문서 키 */
export const DRILL_SYNC_KEY = "ilmunta-drill";

/** 활용 드릴 기록 전체. 서버와는 이 문서 하나를 주고받는다. */
export interface DrillData {
  version: 1;
  updatedAt: number;
  /** 기술 열쇠 → 간격 반복 상태 */
  skills: Record<string, CardState>;
  /** 최고 기록: 연속 맞힘, 60초 동안 맞힌 수 */
  bests: { streak: number; sprint: number };
  /** 드릴을 한 날(YYYY-MM-DD, 기기 시간대). 최근 120일 */
  days: string[];
}

export function emptyDrillData(now = 0): DrillData {
  return {
    version: 1,
    updatedAt: now,
    skills: {},
    bests: { streak: 0, sprint: 0 },
    days: [],
  };
}

function dayKey(now: number): string {
  const d = new Date(now);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function touch(data: DrillData, now: number): DrillData {
  const today = dayKey(now);
  const days = data.days.includes(today)
    ? data.days
    : [...data.days, today].slice(-120);
  return { ...data, updatedAt: now, days };
}

/** 문제 하나에 답했다 */
export function recordAnswer(
  data: DrillData,
  skillKey: string,
  correct: boolean,
  now: number,
): DrillData {
  const card = data.skills[skillKey] ?? newCard(now);
  return touch(
    {
      ...data,
      skills: { ...data.skills, [skillKey]: review(card, correct, now) },
    },
    now,
  );
}

/** 최고 기록을 넘었으면 바꾸고 isNew를 알린다 */
export function recordBest(
  data: DrillData,
  kind: keyof DrillData["bests"],
  score: number,
  now: number,
): { data: DrillData; isNew: boolean } {
  if (score <= data.bests[kind]) return { data, isNew: false };
  return {
    data: touch({ ...data, bests: { ...data.bests, [kind]: score } }, now),
    isNew: true,
  };
}

const isNonNegative = (v: unknown): v is number => isNumber(v) && v >= 0;

/** 서버·기기에서 읽은 값이 드릴 기록 모양이면 그 기록, 아니면 null(zod 없이, srs-shape.ts) */
export function readDrillData(v: unknown): DrillData | null {
  if (!isRecord(v) || v.version !== 1 || !isNumber(v.updatedAt)) return null;
  const skills = readSrsCards(v.skills);
  if (!skills) return null;
  const bests = v.bests;
  if (
    !isRecord(bests) ||
    !isNonNegative(bests.streak) ||
    !isNonNegative(bests.sprint)
  )
    return null;
  if (!isStringArray(v.days)) return null;
  return {
    version: 1,
    updatedAt: v.updatedAt,
    skills,
    bests: { streak: bests.streak, sprint: bests.sprint },
    days: v.days,
  };
}

/** 서버에 보낼 문서. 한 번도 하지 않은 빈 상태는 보내지 않는다 */
export function toVersioned(data: DrillData): Versioned<DrillData> | null {
  if (data.updatedAt === 0) return null;
  return { value: data, updatedAt: data.updatedAt };
}

/** 서버 문서가 더 새것이고 모양이 맞을 때만 그 상태를 돌려준다 */
export function adoptFromServer(
  current: DrillData,
  synced: Versioned<unknown> | null,
): DrillData | null {
  if (!synced || synced.updatedAt <= current.updatedAt) return null;
  const parsed = readDrillData(synced.value);
  if (!parsed) return null;
  return { ...parsed, updatedAt: synced.updatedAt };
}
