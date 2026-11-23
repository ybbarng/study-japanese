import type { CardId } from "./data";
import { type Lesson, nextLesson } from "./lessons";
import { type CardState, dueQueue } from "./srs";
import { dayKey, type KanaData } from "./state";

export type TodayPlan =
  | { kind: "review"; due: number; lesson: Lesson | null }
  | { kind: "lesson"; due: number; lesson: Lesson }
  | { kind: "game"; due: number; lesson: null };

/** 복습이 이만큼 쌓이면 새 레슨보다 복습을 먼저 권한다 */
export const REVIEW_FIRST_AT = 8;

/**
 * 가나 홈에 크게 보일 "오늘 할 것" 하나.
 * - 복습이 많이 쌓였거나, 오늘 이미 레슨을 하나 끝냈고 복습할 것이 있으면 복습
 * - 그 밖에는 다음 레슨, 레슨을 다 끝냈으면 복습 또는 게임
 */
export function todayPlan(data: KanaData, now: number): TodayPlan {
  const due = dueQueue(
    data.cards as Record<CardId, CardState>,
    now,
    Number.POSITIVE_INFINITY,
  ).length;
  const lesson = nextLesson(new Set(Object.keys(data.lessons)));
  const today = dayKey(now);
  const lessonDoneToday = Object.values(data.lessons).some(
    (t) => dayKey(t) === today,
  );
  if (due >= REVIEW_FIRST_AT || (due > 0 && (lessonDoneToday || !lesson)))
    return { kind: "review", due, lesson };
  if (lesson) return { kind: "lesson", due, lesson };
  return { kind: "game", due, lesson: null };
}
