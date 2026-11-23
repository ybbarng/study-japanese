import type { Example, IlmutaLesson } from "@/lib/textbook/schema";
import { conversationScripts } from "./conversation";

// 한 강의 학습 흐름. 책의 차례를 살리되 화면 하나에 한 가지 일만.

export type StepId =
  | "lecture"
  | "words"
  | "patterns"
  | "conversation"
  | "shadowing"
  | "listen"
  | "writing";

export const STEP_LABEL: Record<StepId, string> = {
  lecture: "강의",
  words: "단어",
  patterns: "문형",
  conversation: "회화",
  shadowing: "따라 말하기",
  listen: "더 듣기",
  writing: "쓰기",
};

/** 글 없이 듣기만 하는 코너 */
const LISTEN_ONLY: Example["kind"][] = ["dialogue", "exercise", "longReading"];

export function listenOnlyExamples(lesson: IlmutaLesson): Example[] {
  return lesson.examples.filter((e) => LISTEN_ONLY.includes(e.kind));
}

export function examplesOf(
  lesson: IlmutaLesson,
  kind: Example["kind"],
): Example[] {
  return lesson.examples.filter(
    (e) => e.kind === kind && e.sentences.length > 0,
  );
}

/** 따라 말할 재료: 글이 있는 예문 */
export function shadowingExamples(lesson: IlmutaLesson): Example[] {
  return lesson.examples.filter((e) => e.sentences.length > 0);
}

/** 이 강에 데이터가 있는 단계만 차례대로 */
export function lessonSteps(lesson: IlmutaLesson): StepId[] {
  const steps: StepId[] = ["lecture"];
  if (examplesOf(lesson, "words").length) steps.push("words");
  if (examplesOf(lesson, "patterns").length) steps.push("patterns");
  if (conversationScripts(lesson).length) steps.push("conversation");
  if (shadowingExamples(lesson).length) steps.push("shadowing");
  if (listenOnlyExamples(lesson).length) steps.push("listen");
  if (lesson.no > 0) steps.push("writing");
  return steps;
}

export function parseStep(value: unknown, steps: StepId[]): StepId {
  return typeof value === "string" && (steps as string[]).includes(value)
    ? (value as StepId)
    : steps[0];
}
