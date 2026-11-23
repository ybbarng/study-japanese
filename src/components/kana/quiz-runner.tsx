"use client";

import { useEffect, useRef, useState } from "react";
import { type CardId, cardChar, getSound, parseCardId } from "@/lib/kana/data";
import type { Question } from "@/lib/kana/quiz";
import { playSound } from "./audio";
import s from "./kana.module.css";
import { cn, Glyph, PrimaryButton, SoundButton } from "./ui";

export interface QuizResult {
  correct: number;
  total: number;
  bestCombo: number;
  missed: CardId[];
}

/**
 * 4지선다 문제를 차례로 낸다. 틀린 문제는 끝에 한 번 더 낸다.
 * 답할 때마다 `onAnswer`(간격 반복 기록용)를 부른다.
 */
export function QuizRunner({
  questions,
  onAnswer,
  onDone,
  onProgress,
}: {
  questions: Question[];
  onAnswer: (id: CardId, correct: boolean) => void;
  onDone: (r: QuizResult) => void;
  onProgress?: (fraction: number) => void;
}) {
  const [queue, setQueue] = useState(questions);
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<CardId | null>(null);
  const [combo, setCombo] = useState(0);
  const [showText, setShowText] = useState(false);
  const stats = useRef({ correct: 0, bestCombo: 0, missed: new Set<CardId>() });
  const retried = useRef(new Set<number>());

  const q = queue[index];
  const answered = picked !== null;
  const isRight = picked === q?.answer;

  useEffect(() => {
    onProgress?.(index / queue.length);
  }, [index, queue.length, onProgress]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: 문제가 바뀔 때마다 처음 상태로
  useEffect(() => {
    setShowText(false);
  }, [index]);

  if (!q) return null;
  const { soundId } = parseCardId(q.answer);

  const next = () => {
    if (index + 1 >= queue.length) {
      onDone({
        correct: stats.current.correct,
        total: questions.length,
        bestCombo: stats.current.bestCombo,
        missed: [...stats.current.missed],
      });
      return;
    }
    setPicked(null);
    setIndex(index + 1);
  };

  const pick = (c: CardId) => {
    if (answered) return;
    setPicked(c);
    const ok = c === q.answer;
    onAnswer(q.answer, ok);
    if (ok) {
      // 다시 낸 문제를 맞힌 것은 첫 시도 정답 수에 넣지 않는다
      if (!retried.current.has(index)) stats.current.correct += 1;
      const nc = combo + 1;
      setCombo(nc);
      stats.current.bestCombo = Math.max(stats.current.bestCombo, nc);
      if (q.kind === "char-to-sound") void playSound(soundId);
      setTimeout(next, 650);
    } else {
      setCombo(0);
      stats.current.missed.add(q.answer);
      // 틀린 문제는 끝에 한 번 더
      const again: Question = { ...q, choices: [...q.choices].reverse() };
      retried.current.add(queue.length);
      setQueue([...queue, again]);
      void playSound(soundId);
    }
  };

  const choiceLabel = (c: CardId) => {
    if (q.kind === "sound-to-char")
      return <Glyph className="text-5xl">{cardChar(c)}</Glyph>;
    const sd = getSound(parseCardId(c).soundId);
    return (
      <span className="flex flex-col items-center">
        <span className="text-2xl font-bold">{sd.ko}</span>
        <span className="text-sm text-ink-soft">{sd.romaji}</span>
      </span>
    );
  };

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex h-8 items-center justify-end">
        {combo >= 2 && (
          <span
            key={combo}
            className={cn("text-sm font-bold text-accent", s.pop)}
          >
            {combo} 연속!
          </span>
        )}
      </div>
      <div
        key={index}
        className={cn(
          "flex flex-1 flex-col items-center justify-center gap-4",
          s.enter,
        )}
      >
        {q.kind === "sound-to-char" ? (
          <>
            <p className="text-sm text-ink-soft">소리를 듣고 글자를 고르세요</p>
            <SoundButton
              soundId={soundId}
              autoPlay
              size="lg"
              onUnavailable={() => setShowText(true)}
            />
            {showText || answered ? (
              <p className="text-2xl font-bold">
                {getSound(soundId).ko}{" "}
                <span className="text-base text-ink-soft">
                  {getSound(soundId).romaji}
                </span>
              </p>
            ) : (
              <button
                type="button"
                onClick={() => setShowText(true)}
                className="text-sm text-ink-faint underline"
              >
                글로 보기
              </button>
            )}
          </>
        ) : (
          <>
            <p className="text-sm text-ink-soft">이 글자의 소리는?</p>
            <Glyph
              className={cn(
                "text-[9rem]",
                answered && isRight && s.pop,
                answered && !isRight && s.shake,
              )}
            >
              {cardChar(q.answer)}
            </Glyph>
          </>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3 pt-4">
        {q.choices.map((c) => {
          const isAnswer = c === q.answer;
          return (
            <button
              key={c}
              type="button"
              onClick={() => pick(c)}
              className={cn(
                "flex h-24 items-center justify-center rounded-2xl border-2 border-transparent bg-bg-raised transition active:scale-95",
                answered && isAnswer && cn("border-good bg-good/15", s.pop),
                answered &&
                  c === picked &&
                  !isAnswer &&
                  cn("border-accent bg-accent-soft", s.shake),
                answered && c !== picked && !isAnswer && "opacity-40",
              )}
            >
              {choiceLabel(c)}
            </button>
          );
        })}
      </div>
      <div className="h-20 pt-4">
        {answered && !isRight && (
          <PrimaryButton onClick={next}>
            다음 (끝에 한 번 더 나와요)
          </PrimaryButton>
        )}
      </div>
    </div>
  );
}
