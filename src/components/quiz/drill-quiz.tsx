"use client";

import { useCallback, useEffect, useState } from "react";
import { RubyWord } from "@/components/ilmunta/ruby-word";
import { useDrillReady } from "@/components/ilmunta/use-synced-store";
import { skillsOfLesson } from "@/lib/ilmunta/curriculum";
import { seededRng } from "@/lib/ilmunta/random";
import { useDrillStore } from "@/lib/ilmunta/stores";
import { drillQuizQuestions } from "@/lib/quiz/drill";
import { DRILL_WORDS, drillWordQuestions } from "@/lib/quiz/drill-words";
import { particleQuestions } from "@/lib/quiz/particles";
import { QUESTIONS_PER_SECTION } from "@/lib/quiz/pick";
import type { Question } from "@/lib/quiz/types";
import { QuizCard, type RenderJa } from "./quiz-card";

/**
 * 일문따 과 화면 끝의 확인 문제: 이 과에서 다루는 활용을 문장 빈칸으로 3문제.
 * 답은 활용 드릴의 기술 기록(간격 반복)에 그대로 쌓여, 틀린 활용은 드릴에서도 먼저 나온다.
 * 활용을 다루지 않는 과는 그 과의 쓰임(조사 고르기, 5·26·27과)과 그 과 낱말의 뜻·읽는 법으로 3문제
 * (기록은 남기지 않고 그 자리에서 고쳐 준다).
 */
export function DrillQuiz({ lesson }: { lesson: number }) {
  const ready = useDrillReady();
  const answerSkill = useDrillStore((s) => s.answer);
  const [round, setRound] = useState(0);
  const [built, setBuilt] = useState<{
    questions: Question[];
    skillOf: Map<string, string>;
  } | null>(null);

  const wordsOnly = skillsOfLesson(lesson).length === 0;

  // 기록을 읽은 뒤·다시 풀 때만 새로 만든다(답할 때마다 바뀌는 기록은 읽기만 한다)
  useEffect(() => {
    const now = Date.now();
    const rng = seededRng((now ^ (round * 7919)) >>> 0);
    // 활용을 다루지 않는 과(쓰임·조사를 배우는 과)는 그 과의 쓰임(조사 고르기)을 먼저 묻고,
    // 모자라면 그 과 드릴 낱말의 뜻·읽는 법으로 채운다
    if (wordsOnly) {
      const usage = particleQuestions(lesson, rng);
      const rest = QUESTIONS_PER_SECTION - usage.length;
      setBuilt({
        questions: [
          ...usage,
          ...(rest > 0
            ? drillWordQuestions(lesson, rng, DRILL_WORDS, rest)
            : []),
        ],
        skillOf: new Map(),
      });
      return;
    }
    if (!ready) return;
    setBuilt(
      drillQuizQuestions(
        lesson,
        useDrillStore.getState().data.skills,
        rng,
        now,
      ),
    );
  }, [ready, round, lesson, wordsOnly]);

  const renderJa: RenderJa = useCallback(
    (text, opts = {}) =>
      opts.ruby && opts.reading ? (
        <RubyWord form={{ kanji: text, reading: opts.reading }} />
      ) : (
        <span lang="ja">{text}</span>
      ),
    [],
  );

  if (!built || built.questions.length === 0) return null;
  const hasUsage = built.questions.some((q) => q.key.includes(":p:"));
  return (
    <QuizCard
      title={
        !wordsOnly
          ? "확인 문제 · 이 과 활용"
          : hasUsage
            ? "확인 문제 · 이 과 쓰임"
            : "확인 문제 · 이 과 낱말"
      }
      questions={built.questions}
      onAnswer={(q, correct) => {
        const skill = built.skillOf.get(q.key);
        if (skill) answerSkill(skill, correct);
      }}
      onRestart={() => setRound((r) => r + 1)}
      renderJa={renderJa}
      missedNote={
        wordsOnly
          ? "틀린 낱말은 '다른 문제 풀기'로 다시 섞어 풀어 보세요."
          : undefined
      }
    />
  );
}
