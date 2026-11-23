import { z } from "zod";
import { type CardState, newCard, review } from "@/lib/kana/srs";
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

const cardSchema = z.object({
  box: z.number().int().min(0),
  due: z.number(),
  lapses: z.number().int().min(0),
  reps: z.number().int().min(0),
  lastSeen: z.number(),
  lastCorrect: z.boolean(),
});

export const drillDataSchema = z.object({
  version: z.literal(1),
  updatedAt: z.number(),
  skills: z.record(z.string(), cardSchema),
  bests: z.object({ streak: z.number().min(0), sprint: z.number().min(0) }),
  days: z.array(z.string()),
});

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
  const parsed = drillDataSchema.safeParse(synced.value);
  if (!parsed.success) return null;
  return { ...parsed.data, updatedAt: synced.updatedAt };
}
