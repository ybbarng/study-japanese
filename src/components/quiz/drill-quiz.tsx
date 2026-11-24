"use client";

import { useCallback, useEffect, useState } from "react";
import { RubyWord } from "@/components/ilmunta/ruby-word";
import { useDrillReady } from "@/components/ilmunta/use-synced-store";
import { seededRng } from "@/lib/ilmunta/random";
import { useDrillStore } from "@/lib/ilmunta/stores";
import { drillQuizQuestions } from "@/lib/quiz/drill";
import type { Question } from "@/lib/quiz/types";
import { QuizCard, type RenderJa } from "./quiz-card";

/**
 * 일문따 과 화면 끝의 확인 문제: 이 과에서 다루는 활용을 문장 빈칸으로 3문제.
 * 답은 활용 드릴의 기술 기록(간격 반복)에 그대로 쌓여, 틀린 활용은 드릴에서도 먼저 나온다.
 */
export function DrillQuiz({ lesson }: { lesson: number }) {
  const ready = useDrillReady();
  const answerSkill = useDrillStore((s) => s.answer);
  const [round, setRound] = useState(0);
  const [built, setBuilt] = useState<{
    questions: Question[];
    skillOf: Map<string, string>;
  } | null>(null);

  // 기록을 읽은 뒤·다시 풀 때만 새로 만든다(답할 때마다 바뀌는 기록은 읽기만 한다)
  useEffect(() => {
    if (!ready) return;
    const now = Date.now();
    setBuilt(
      drillQuizQuestions(
        lesson,
        useDrillStore.getState().data.skills,
        seededRng((now ^ (round * 7919)) >>> 0),
        now,
      ),
    );
  }, [ready, round, lesson]);

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
  return (
    <QuizCard
      title="확인 문제 · 이 과 활용"
      questions={built.questions}
      onAnswer={(q, correct) => {
        const skill = built.skillOf.get(q.key);
        if (skill) answerSkill(skill, correct);
      }}
      onRestart={() => setRound((r) => r + 1)}
      renderJa={renderJa}
    />
  );
}
