"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchTranscript } from "@/components/context/use-transcript";
import { RubyText } from "@/components/ilmuta/ruby-text";
import { Ruby } from "@/components/songs/line-words";
import { TapSentence } from "@/components/word-tap/tap-sentence";
import { seededRng } from "@/lib/ilmunta/random";
import { ilmutaMediaUrl } from "@/lib/ilmuta/media";
import type { LessonData } from "@/lib/ilmuta/server-data";
import { STEP_LABEL } from "@/lib/ilmuta/steps";
import { clipItems, type QuizStep, sectionQuestions } from "@/lib/quiz/build";
import { type ClipIndex, clipSpans, type Span, spanOf } from "@/lib/quiz/clips";
import { dueKeys } from "@/lib/quiz/review-state";
import { useQuizStore } from "@/lib/quiz/store";
import type { ClipRef, Question } from "@/lib/quiz/types";
import { wordRuby } from "@/lib/songs/words";
import { playClip, useClipPlaying, useStopClipOnUnmount } from "./clip-player";
import { QuizCard, type RenderJa } from "./quiz-card";
import { useQuizHydrated } from "./use-quiz-ready";

const SECTION_LETTER: Record<QuizStep, string> = {
  words: "w",
  patterns: "p",
  conversation: "c",
};

/** 자막을 이만큼 기다려도 안 오면 소리 문제 없이 낸다 */
const CLIP_WAIT_MS = 4000;

/** 이 구역 예문들의 자막을 받아 문장마다 소리 구간을 안다. 다 받기 전에는 null */
function useClipIndex(data: LessonData, step: QuizStep): ClipIndex | null {
  const { lesson } = data;
  const items = useMemo(() => clipItems(step, lesson), [step, lesson]);
  const [index, setIndex] = useState<ClipIndex | null>(null);
  useEffect(() => {
    let cancelled = false;
    const examples = lesson.examples.filter((e) => items.includes(e.id));
    const all = Promise.all(
      examples.map(async (e) => {
        const t = await fetchTranscript("ilmuta", e.id);
        return [
          e.id,
          t ? clipSpans(t, e.sentences) : new Map<number, Span>(),
        ] as const;
      }),
    ).then((pairs) => new Map(pairs));
    const timeout = new Promise<ClipIndex>((resolve) =>
      setTimeout(() => resolve(new Map()), CLIP_WAIT_MS),
    );
    void Promise.race([all, timeout]).then((m) => {
      if (!cancelled) setIndex(m);
    });
    return () => {
      cancelled = true;
    };
  }, [lesson, items]);
  return index;
}

/**
 * 일무따 강 화면 구역(단어·문형·회화) 끝의 확인 문제. 그 강 교재 데이터로 2~4문제를 만들고,
 * 복습할 때가 된 이 구역 문제를 먼저 낸다. 소리 문제는 예문 mp3의 그 문장 구간만 튼다.
 */
export function SectionQuiz({
  data,
  step,
}: {
  data: LessonData;
  step: QuizStep;
}) {
  const { lesson, glossary, quizPool, wordTap } = data;
  const hydrated = useQuizHydrated();
  const clips = useClipIndex(data, step);
  const record = useQuizStore((s) => s.answer);
  const playing = useClipPlaying();
  useStopClipOnUnmount();
  const [round, setRound] = useState(0);
  const [questions, setQuestions] = useState<Question[] | null>(null);

  const srcOf = useCallback(
    (item: string) => {
      const e = lesson.examples.find((x) => x.id === item);
      return e ? ilmutaMediaUrl(e.file) : null;
    },
    [lesson],
  );

  // biome-ignore lint/correctness/useExhaustiveDependencies: 기록을 읽고 자막을 받은 뒤·다시 풀 때만 새로 만든다
  useEffect(() => {
    if (!hydrated || !clips) return;
    const now = Date.now();
    const prefer = new Set(
      dueKeys(
        useQuizStore.getState().data,
        now,
        `L${lesson.no}:${SECTION_LETTER[step]}:`,
      ),
    );
    setQuestions(
      sectionQuestions(step, {
        lesson,
        pool: quizPool,
        rng: seededRng((now ^ (round * 7919)) >>> 0),
        hasClip: (c) => !!spanOf(clips, c) && !!srcOf(c.item),
        tokensOf: (ja) => wordTap.analyses[ja]?.tokens,
        prefer,
      }),
    );
  }, [hydrated, clips, round]);

  const clip = useMemo(
    () =>
      clips
        ? {
            can: (c: ClipRef) => !!spanOf(clips, c) && !!srcOf(c.item),
            play: (c: ClipRef) => {
              const span = spanOf(clips, c);
              const src = srcOf(c.item);
              if (span && src) playClip(src, span);
            },
            playing,
          }
        : undefined,
    [clips, srcOf, playing],
  );

  const renderJa: RenderJa = useCallback(
    (text, opts = {}) => {
      // 읽는 법은 낱말 분석(문맥에 맞는 읽기)을 먼저, 없으면 배운 단어 사전으로
      const tokens = opts.tokens ?? wordTap.analyses[text]?.tokens;
      const ruby = !opts.ruby ? (
        <span lang="ja">{text}</span>
      ) : tokens && !opts.reading ? (
        <span lang="ja" className="[&_rt]:text-[0.45em]">
          {tokens.map((t, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: 조각 차례가 곧 열쇠다
            <Ruby key={i} segments={wordRuby(t)} showReading />
          ))}
        </span>
      ) : (
        <RubyText text={text} reading={opts.reading} glossary={glossary} />
      );
      return opts.tap ? (
        <TapSentence ja={text} showReading fallback={ruby} />
      ) : (
        ruby
      );
    },
    [glossary, wordTap],
  );

  if (!questions || questions.length === 0) return null;
  return (
    <QuizCard
      title={`확인 문제 · ${STEP_LABEL[step]}`}
      questions={questions}
      onAnswer={(q, correct) => record(q.key, correct)}
      onRestart={() => setRound((r) => r + 1)}
      clip={clip}
      renderJa={renderJa}
    />
  );
}
