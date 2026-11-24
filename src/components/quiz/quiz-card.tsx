"use client";

import { type ReactNode, useEffect, useId, useRef, useState } from "react";
import { InlineKey } from "@/components/keyboard/key-help";
import { toKeyInput } from "@/components/keyboard/key-input";
import { cn } from "@/lib/cn";
import { choiceIndexFor } from "@/lib/keyboard/choice-key";
import { activeQuiz } from "@/lib/quiz/active";
import type { ClipRef, Question } from "@/lib/quiz/types";
import { ChoiceView } from "./quiz-choice";
import { OrderView } from "./quiz-order";

/** 일본어 글을 그리는 법(강 화면은 배운 단어로 후리가나를 달고 낱말을 누르게 한다) */
export type RenderJa = (
  text: string,
  opts?: {
    reading?: string;
    ruby?: boolean;
    tap?: boolean;
    /** 낱말 분석에서 온 조각별 읽는 법(어순 조각) */
    tokens?: { surface: string; reading?: string }[];
  },
) => ReactNode;

export interface ClipControl {
  can: (clip: ClipRef) => boolean;
  play: (clip: ClipRef) => void;
  playing: boolean;
}

/** 맞힌 뒤 다음 문제로 넘어가기까지 */
const NEXT_AFTER_RIGHT_MS = 900;

/** 위에 붙은 재생기가 가리는 높이 */
function coveredTop(): number {
  let top = 0;
  for (const el of document.querySelectorAll<HTMLElement>(
    "[data-player-bar]",
  )) {
    const r = el.getBoundingClientRect();
    if (
      r.height > 0 &&
      getComputedStyle(el).position === "sticky" &&
      r.top <= 1
    )
      top = Math.max(top, r.bottom);
  }
  return top;
}

/** 화면의 확인 문제 묶음 중 이것이 키를 받을 차례인지 */
function isActive(el: HTMLElement | null): boolean {
  if (!el) return false;
  const all = [...document.querySelectorAll<HTMLElement>("[data-quiz]")];
  const boxes = all.map((q) => {
    const r = q.getBoundingClientRect();
    return {
      top: r.top,
      bottom: r.bottom,
      focused: q.contains(document.activeElement),
      open: q.dataset.quizOpen === "true",
    };
  });
  const i = activeQuiz(boxes, {
    height: window.innerHeight,
    coveredTop: coveredTop(),
  });
  return i >= 0 && all[i] === el;
}

/**
 * 구역 끝 확인 문제 묶음. 문제를 하나씩 풀고, 맞히면 짧게 넘어가고, 틀리면 정답·까닭·다시 듣기를 보인다.
 * 틀린 문제는 끝에 한 번 더 낸다. 답할 때마다 onAnswer(간격 반복 기록)를 부른다.
 * PC: 숫자 키로 고르고 Enter로 다음. 화면에 묶음이 여럿이면 보이는 것(또는 초점이 든 것) 하나만 키를 받는다.
 */
export function QuizCard({
  title,
  questions,
  onAnswer,
  onRestart,
  clip,
  renderJa,
  missedNote = "틀린 문제는 기록해 두었다가 나중에 다시 냅니다.",
}: {
  title: string;
  questions: Question[];
  onAnswer: (q: Question, correct: boolean) => void;
  onRestart: () => void;
  clip?: ClipControl;
  renderJa: RenderJa;
  /** 틀린 문제가 있을 때 끝 화면에 보일 안내(기록하지 않는 문제는 다르게 적는다) */
  missedNote?: string;
}) {
  const [queue, setQueue] = useState(questions);
  const [index, setIndex] = useState(0);
  const [result, setResult] = useState<{
    correct: boolean;
    picked: number | null;
  } | null>(null);
  const [firstTry, setFirstTry] = useState(0);
  const [touched, setTouched] = useState(false);
  const retried = useRef(new Set<number>());
  const root = useRef<HTMLElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();

  // 새 문제 묶음을 받으면 처음부터
  useEffect(() => {
    setQueue(questions);
    setIndex(0);
    setResult(null);
    setFirstTry(0);
    retried.current = new Set();
  }, [questions]);

  const q = queue[index];
  const done = index >= queue.length;

  const next = () => {
    setResult(null);
    setIndex((i) => i + 1);
  };

  const answer = (correct: boolean, picked: number | null) => {
    if (!q || result) return;
    setTouched(true);
    setResult({ correct, picked });
    onAnswer(q, correct);
    if (correct) {
      if (!retried.current.has(index)) setFirstTry((n) => n + 1);
    } else if (!retried.current.has(index)) {
      // 틀린 문제는 끝에 한 번 더(보기 차례는 뒤집어 자리로 외우지 않게)
      retried.current.add(queue.length);
      const again: Question =
        q.type === "choice"
          ? {
              ...q,
              options: [...q.options].reverse(),
              answer: q.options.length - 1 - q.answer,
            }
          : { ...q, tiles: [...q.tiles].reverse() };
      setQueue([...queue, again]);
    }
  };

  // 맞히면 잠깐 보이고 넘어간다. 틀리면 "다음" 단추에 초점(Enter로 넘김)
  // biome-ignore lint/correctness/useExhaustiveDependencies: 답이 바뀔 때만 본다
  useEffect(() => {
    if (!result) return;
    if (result.correct) {
      const t = setTimeout(next, NEXT_AFTER_RIGHT_MS);
      return () => clearTimeout(t);
    }
    nextRef.current?.focus({ preventScroll: true });
  }, [result]);

  // 숫자 키: 고르기(어순 문제는 조각 놓기), Enter: 다음, Backspace: 어순 조각 하나 빼기
  const keyTarget = useRef<(e: KeyboardEvent) => boolean>(() => false);
  const orderKeys = useRef<(e: KeyboardEvent) => boolean>(() => false);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!isActive(root.current)) return;
      if (keyTarget.current(e)) e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  keyTarget.current = (e) => {
    if (done || !q) return false;
    const tag = (e.target as HTMLElement | null)?.tagName;
    if (e.key === "Enter" && result && !result.correct) {
      // 단추에 초점이 있으면 그 단추가 Enter를 받는다
      if (tag === "BUTTON" || tag === "A") return false;
      next();
      return true;
    }
    if (result) return false;
    if (q.type === "choice") {
      const i = choiceIndexFor(toKeyInput(e), q.options.length);
      if (i === null) return false;
      answer(i === q.answer, i);
      return true;
    }
    return orderKeys.current(e);
  };

  const right = q?.type === "choice" && result ? q.answer : null;

  return (
    <section
      ref={root}
      data-quiz
      data-quiz-open={done ? "false" : "true"}
      aria-labelledby={titleId}
      className="mt-6 rounded-2xl border border-line bg-bg-raised p-4 lg:mt-8 lg:p-6"
    >
      <header className="flex items-center justify-between gap-3">
        <h3 id={titleId} className="text-sm font-medium text-accent">
          {title}
        </h3>
        {!done ? (
          <p className="flex items-center gap-1.5">
            <span className="sr-only">
              {index + 1} / {queue.length}
            </span>
            {queue.map((qq, i) => (
              <span
                aria-hidden
                // biome-ignore lint/suspicious/noArrayIndexKey: 다시 낸 문제는 열쇠가 같아 차례를 붙인다
                key={`${qq.key}-${i}`}
                className={cn(
                  "h-1.5 w-4 rounded-full",
                  i < index
                    ? "bg-accent"
                    : i === index
                      ? "bg-accent/50"
                      : "bg-line",
                )}
              />
            ))}
          </p>
        ) : null}
      </header>

      {done ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-lg">
            {questions.length}문제 중 <b className="text-accent">{firstTry}</b>
            개를 한 번에 맞혔어요
            {firstTry < questions.length ? (
              <span className="block text-sm text-ink-soft">{missedNote}</span>
            ) : null}
          </p>
          <button
            type="button"
            onClick={onRestart}
            className="rounded-xl border border-line px-4 py-2 text-sm lg:hover:border-accent"
          >
            다른 문제 풀기
          </button>
        </div>
      ) : q ? (
        <div key={`${q.key}-${index}`} className="mt-4">
          {q.type === "choice" ? (
            <ChoiceView
              question={q}
              picked={result?.picked ?? null}
              answered={!!result}
              onPick={(i) => answer(i === q.answer, i)}
              clip={clip}
              autoPlay={touched}
              renderJa={renderJa}
            />
          ) : (
            <OrderView
              question={q}
              answered={!!result}
              correct={result?.correct ?? false}
              onDone={(ok) => answer(ok, null)}
              keys={orderKeys}
              renderJa={renderJa}
            />
          )}

          {result?.correct ? (
            <p role="status" className="mt-4 font-medium text-good">
              맞았어요
            </p>
          ) : null}

          {result && !result.correct ? (
            <div
              role="status"
              className="mt-4 space-y-3 rounded-xl bg-bg-sunken p-4"
            >
              <p className="font-medium">
                <span className="text-accent">아쉬워요.</span>{" "}
                {q.type === "choice" ? (
                  <>
                    정답은{" "}
                    <span
                      lang={q.options[q.answer].ja ? "ja" : undefined}
                      className="font-bold"
                    >
                      {q.options[q.answer].label}
                    </span>
                  </>
                ) : (
                  <>
                    맞는 차례는{" "}
                    <span lang="ja" className="font-bold">
                      {q.answer.join(" / ")}
                    </span>
                  </>
                )}
              </p>
              {q.type === "choice" &&
              result.picked !== null &&
              result.picked !== right
                ? (() => {
                    const note = q.options[result.picked]?.note;
                    return note ? (
                      <p className="text-sm text-ink-soft">고른 보기: {note}</p>
                    ) : null;
                  })()
                : null}
              {q.explain ? (
                <p className="text-sm text-ink-soft">{q.explain}</p>
              ) : null}
              {q.reveal ? (
                <div>
                  <p className="font-ja-serif text-xl leading-loose lg:text-2xl">
                    {renderJa(q.reveal.ja, {
                      reading: q.reveal.reading,
                      ruby: true,
                      tap: true,
                    })}
                  </p>
                  <p className="text-sm text-ink-soft">{q.reveal.ko}</p>
                </div>
              ) : null}
              <div className="flex flex-wrap gap-2">
                {q.clip && clip?.can(q.clip) ? (
                  <button
                    type="button"
                    onClick={() => q.clip && clip.play(q.clip)}
                    className="rounded-xl border border-line px-4 py-2 text-sm lg:hover:border-accent"
                  >
                    {clip.playing ? "듣는 중…" : "▶ 그 문장 다시 듣기"}
                  </button>
                ) : null}
                <button
                  ref={nextRef}
                  type="button"
                  onClick={next}
                  className="rounded-xl bg-accent px-4 py-2 text-sm font-medium text-white"
                >
                  다음 →
                  <InlineKey k="Enter" onAccent />
                </button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
