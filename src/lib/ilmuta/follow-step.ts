import type { IlmutaLesson } from "@/lib/textbook/schema";
import { examplesOf, type StepId } from "./steps";
import { lectureItem } from "./tracks";

// 강의가 끝나 대기열이 그 강 예문으로 넘어갈 때, 화면도 지금 소리 나는 예문의 단계로 옮겨 갈지 정한다.

/** 재생기 항목(강의 L01, 예문 01-2)이 이 강의 어느 단계에서 보이는지. 이 강 것이 아니면 null */
export function stepOfItem(lesson: IlmutaLesson, item: string): StepId | null {
  if (item === lectureItem(lesson.no)) return "lecture";
  const example = lesson.examples.find((e) => e.id === item);
  if (!example) return null;
  const hasText = (kind: typeof example.kind) =>
    examplesOf(lesson, kind).some((e) => e.id === item);
  if (example.kind === "words" && hasText("words")) return "words";
  if (example.kind === "patterns" && hasText("patterns")) return "patterns";
  if (
    (example.kind === "conversationBasic" ||
      example.kind === "conversationAdvanced") &&
    example.sentences.length > 0
  )
    return "conversation";
  return "listen";
}

/** 글을 보며 따라갈 수 있는 단계(듣기만 하는 단계로는 옮기지 않는다) */
const TEXT_STEPS: StepId[] = ["words", "patterns", "conversation"];

/**
 * 트랙이 prev에서 next로 넘어갔을 때 옮겨 갈 단계. 옮기지 않으면 null.
 * 사용자가 소리를 따라 보고 있을 때만 옮긴다: 강의 단계에 있거나, 방금 끝난 트랙의 단계에 있을 때.
 * (쓰기 단계처럼 다른 일을 하고 있으면 그대로 둔다)
 */
export function followStep(
  lesson: IlmutaLesson,
  steps: StepId[],
  current: StepId,
  prev: string | null,
  next: string | null,
): StepId | null {
  if (!prev || !next || prev === next) return null;
  const target = stepOfItem(lesson, next);
  if (!target || target === current || !TEXT_STEPS.includes(target))
    return null;
  if (!steps.includes(target)) return null;
  const following =
    current === "lecture" || current === stepOfItem(lesson, prev);
  return following ? target : null;
}
