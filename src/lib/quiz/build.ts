import type { Rng } from "@/lib/ilmunta/random";
import type { StepId } from "@/lib/ilmuta/steps";
import type { IlmutaLesson } from "@/lib/textbook/schema";
import { conversationQuestions } from "./conversation";
import { patternQuestions, type TokensOf } from "./patterns";
import type { QuizPool } from "./pool";
import type { HasClip, Question } from "./types";
import { wordQuestions } from "./words";

// 일무따 강 화면의 어느 구역 끝에 어떤 문제를 낼지.

export type QuizStep = Extract<StepId, "words" | "patterns" | "conversation">;

export const QUIZ_STEPS: readonly QuizStep[] = [
  "words",
  "patterns",
  "conversation",
];

export function isQuizStep(s: StepId): s is QuizStep {
  return (QUIZ_STEPS as readonly string[]).includes(s);
}

export interface BuildContext {
  lesson: IlmutaLesson;
  pool: QuizPool;
  rng: Rng;
  hasClip: HasClip;
  tokensOf: TokensOf;
  /** 복습할 때가 된 문제 열쇠(먼저 낸다) */
  prefer?: ReadonlySet<string>;
}

export function sectionQuestions(
  step: QuizStep,
  ctx: BuildContext,
): Question[] {
  const { lesson, pool, rng, hasClip, tokensOf, prefer } = ctx;
  switch (step) {
    case "words":
      return wordQuestions(lesson, pool, rng, hasClip, prefer);
    case "patterns":
      return patternQuestions(lesson, pool, rng, hasClip, tokensOf, prefer);
    case "conversation":
      return conversationQuestions(lesson, pool, rng, hasClip, prefer);
  }
}

/** 소리 구간을 찾아야 하는 예문 mp3(구역마다). 화면이 이것들의 자막을 받아 구간을 안다 */
export function clipItems(step: QuizStep, lesson: IlmutaLesson): string[] {
  const kinds =
    step === "words"
      ? ["words"]
      : step === "patterns"
        ? ["patterns"]
        : ["conversationAdvanced", "conversationBasic"];
  return lesson.examples
    .filter((e) => kinds.includes(e.kind) && e.sentences.length > 0)
    .map((e) => e.id);
}
