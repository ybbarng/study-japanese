import { z } from "zod";
import { type CardState, dueQueue, newCard, review } from "@/lib/kana/srs";
import type { Versioned } from "@/lib/sync/state-sync";

// 교재 영역 확인 문제의 간격 반복 기록. 틀린 문제만 카드로 남기고(맞힌 적만 있는 문제는 남기지 않는다),
// 가나 카드와 같은 Leitner 상자 규칙(src/lib/kana/srs.ts)으로 다시 낼 때를 정한다.
// 관리자는 서버 상태 문서(QUIZ_SYNC_KEY)와 맞추고, 방문자는 자기 브라우저에만 둔다.

export const QUIZ_SYNC_KEY = "ilmuta-quiz";

/** 카드 수 상한(서버 문서 크기 512KB 안쪽으로) */
export const MAX_CARDS = 2000;

export interface QuizData {
  version: 1;
  updatedAt: number;
  /** 문제 열쇠(`L<강>:<구역>:<갈래>:<예문>#<차례>`) → 간격 반복 상태 */
  cards: Record<string, CardState>;
}

export function emptyQuizData(now = 0): QuizData {
  return { version: 1, updatedAt: now, cards: {} };
}

/** 문제 하나에 답했다. 처음 보는 문제를 맞혔으면 남기지 않는다 */
export function recordQuizAnswer(
  data: QuizData,
  key: string,
  correct: boolean,
  now: number,
): QuizData {
  const card = data.cards[key];
  if (!card && correct) return data;
  let cards = {
    ...data.cards,
    [key]: review(card ?? newCard(now), correct, now),
  };
  const keys = Object.keys(cards);
  if (keys.length > MAX_CARDS) {
    // 가장 오래전에 본 카드부터 덜어 낸다
    const drop = keys
      .toSorted((a, b) => cards[a].lastSeen - cards[b].lastSeen)
      .slice(0, keys.length - MAX_CARDS);
    cards = Object.fromEntries(
      Object.entries(cards).filter(([k]) => !drop.includes(k)),
    );
  }
  return { ...data, updatedAt: now, cards };
}

/** 열쇠에서 강 번호 */
export function lessonOfKey(key: string): number | null {
  const m = key.match(/^L(\d+):/);
  return m ? Number(m[1]) : null;
}

/** 열쇠에서 구역(w·p·c·d) */
export function sectionOfKey(key: string): string | null {
  return key.split(":")[1] ?? null;
}

/** 다시 낼 때가 된 문제 열쇠(마지막에 틀린 것 먼저). prefix를 주면 그것으로 시작하는 열쇠만 */
export function dueKeys(data: QuizData, now: number, prefix = ""): string[] {
  const cards = Object.fromEntries(
    Object.entries(data.cards).filter(([k]) => k.startsWith(prefix)),
  );
  return dueQueue(cards, now, 100);
}

const STEP_OF: Record<string, "words" | "patterns" | "conversation"> = {
  w: "words",
  p: "patterns",
  c: "conversation",
};

/**
 * 일무따 강마다 다시 낼 때가 된 문제 수와, 그 강에서 먼저 갈 구역(다시 낼 문제가 가장 많은 구역).
 * 강 번호 차례. 일문따 활용(d)은 드릴 기록으로 따로 다시 내므로 세지 않는다
 */
export function dueByLesson(
  data: QuizData,
  now: number,
): {
  lesson: number;
  count: number;
  step: "words" | "patterns" | "conversation";
}[] {
  const byLesson = new Map<number, Map<string, number>>();
  for (const k of dueKeys(data, now)) {
    const no = lessonOfKey(k);
    const step = STEP_OF[sectionOfKey(k) ?? ""];
    if (no === null || !step) continue;
    const m = byLesson.get(no) ?? new Map<string, number>();
    m.set(step, (m.get(step) ?? 0) + 1);
    byLesson.set(no, m);
  }
  return [...byLesson]
    .map(([lesson, m]) => {
      const steps = [...m].sort((a, b) => b[1] - a[1]);
      return {
        lesson,
        count: steps.reduce((n, [, c]) => n + c, 0),
        step: steps[0][0] as "words" | "patterns" | "conversation",
      };
    })
    .sort((a, b) => a.lesson - b.lesson);
}

const cardSchema = z.object({
  box: z.number().int().min(0),
  due: z.number(),
  lapses: z.number().int().min(0),
  reps: z.number().int().min(0),
  lastSeen: z.number(),
  lastCorrect: z.boolean(),
});

export const quizDataSchema = z.object({
  version: z.literal(1),
  updatedAt: z.number(),
  cards: z.record(z.string(), cardSchema),
});

/** 서버에 보낼 문서. 한 번도 틀린 적 없는 빈 상태는 보내지 않는다 */
export function toVersioned(data: QuizData): Versioned<QuizData> | null {
  if (data.updatedAt === 0) return null;
  return { value: data, updatedAt: data.updatedAt };
}

/** 서버 문서가 더 새것이고 모양이 맞을 때만 그 상태를 돌려준다 */
export function adoptFromServer(
  current: QuizData,
  synced: Versioned<unknown> | null,
): QuizData | null {
  if (!synced || synced.updatedAt <= current.updatedAt) return null;
  const parsed = quizDataSchema.safeParse(synced.value);
  if (!parsed.success) return null;
  return { ...parsed.data, updatedAt: synced.updatedAt };
}
