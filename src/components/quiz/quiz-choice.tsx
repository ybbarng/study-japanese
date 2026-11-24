"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import type { ChoiceQuestion } from "@/lib/quiz/types";
import type { ClipControl, RenderJa } from "./quiz-card";

/** 보기가 이보다 길면 한 줄에 하나씩 */
const LONG_OPTION = 9;

/** 고르기 문제: 묻는 것(낱말·소리·빈칸·상황)과 보기 */
export function ChoiceView({
  question: q,
  picked,
  answered,
  onPick,
  clip,
  autoPlay,
  renderJa,
}: {
  question: ChoiceQuestion;
  picked: number | null;
  answered: boolean;
  onPick: (i: number) => void;
  clip?: ClipControl;
  /** 학습자가 이 묶음을 풀기 시작한 뒤면 소리 문제를 바로 튼다(처음 문제는 눌러야 튼다) */
  autoPlay: boolean;
  renderJa: RenderJa;
}) {
  const p = q.prompt;
  const canListen = p.kind === "listen" && !!clip?.can(p.clip);
  const [showText, setShowText] = useState(p.kind === "listen" && !canListen);

  // biome-ignore lint/correctness/useExhaustiveDependencies: 문제가 나올 때 한 번만 튼다
  useEffect(() => {
    if (p.kind === "listen" && canListen && autoPlay) clip?.play(p.clip);
  }, []);

  const long = q.options.some((o) => Array.from(o.label).length > LONG_OPTION);

  return (
    <div>
      <p className="text-sm text-ink-soft">{p.ask}</p>
      <div className="mt-3">
        {p.kind === "word" ? (
          <p className="font-ja-serif text-4xl lg:text-5xl">
            {renderJa(p.word.ja, {
              reading:
                p.word.reading ?? (answered ? q.reveal?.reading : undefined),
              ruby: !!p.word.reading || answered,
            })}
          </p>
        ) : null}
        {p.kind === "listen" ? (
          <div className="flex flex-wrap items-center gap-3">
            {canListen ? (
              <button
                type="button"
                onClick={() => clip?.play(p.clip)}
                aria-label="소리 듣기"
                className={cn(
                  "grid size-16 place-items-center rounded-full bg-accent text-2xl text-white",
                  clip?.playing && "animate-pulse",
                )}
              >
                ▶
              </button>
            ) : null}
            {showText || answered ? (
              <p className="font-ja-serif text-2xl lg:text-3xl">
                {renderJa(p.fallback.ja, {
                  reading: p.fallback.reading,
                  ruby: true,
                })}
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
          </div>
        ) : null}
        {p.kind === "blank" ? (
          <div>
            <p
              lang="ja"
              className="font-ja-serif text-2xl leading-loose lg:text-3xl"
            >
              {p.before}
              <span className="mx-1 inline-block min-w-16 border-b-2 border-accent text-center text-accent">
                {answered ? q.options[q.answer].label : "？"}
              </span>
              {p.after}
            </p>
            <p className="mt-1 text-ink-soft">{p.ko}</p>
          </div>
        ) : null}
        {p.kind === "say" ? (
          <div className="space-y-3">
            {p.before ? (
              <div className="rounded-xl bg-bg-sunken px-3 py-2">
                {p.before.speaker ? (
                  <p lang="ja" className="text-xs text-ink-faint">
                    {p.before.speaker}
                  </p>
                ) : null}
                <p className="font-ja-serif text-lg">
                  {renderJa(p.before.ja, { ruby: true })}
                </p>
                <p className="text-sm text-ink-soft">{p.before.ko}</p>
              </div>
            ) : null}
            <p className="text-lg">“{p.ko}”</p>
          </div>
        ) : null}
      </div>

      <ul
        className={cn(
          // PC도 교재 칸이 폰보다 조금 넓은 정도라 짧은 보기는 두 줄, 긴 보기는 한 줄에 하나
          "mt-4 grid gap-2",
          long ? "grid-cols-1" : "grid-cols-2",
        )}
      >
        {q.options.map((o, i) => {
          const isAnswer = i === q.answer;
          return (
            // biome-ignore lint/suspicious/noArrayIndexKey: 보기 차례가 곧 열쇠(같은 글 보기는 없다)
            <li key={i}>
              <button
                type="button"
                disabled={answered}
                onClick={() => onPick(i)}
                className={cn(
                  "relative flex min-h-14 w-full items-center gap-3 rounded-xl border-2 border-transparent bg-bg px-3 py-2 text-left transition active:scale-[0.98] lg:hover:border-line",
                  answered && isAnswer && "border-good bg-good/15",
                  answered &&
                    i === picked &&
                    !isAnswer &&
                    "border-accent bg-accent-soft",
                  answered && i !== picked && !isAnswer && "opacity-50",
                )}
              >
                <kbd
                  aria-hidden
                  className="hidden rounded-md border border-line px-1.5 font-mono text-xs text-ink-faint lg:block"
                >
                  {i + 1}
                </kbd>
                <span
                  className={cn(
                    "min-w-0 break-keep",
                    o.ja ? "font-ja-serif text-xl" : "text-base",
                  )}
                >
                  {o.ja
                    ? renderJa(o.label, {
                        reading: answered ? o.reading : undefined,
                        ruby: answered || q.prompt.kind === "say",
                      })
                    : o.label}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
