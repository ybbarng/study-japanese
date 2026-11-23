"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import { isCorrectAnswer, toKanaIfRomaji } from "@/lib/ilmunta/check";
import {
  buildExam,
  type ExamQuestion,
  examLessons,
  scoreExam,
} from "@/lib/ilmunta/exam";
import { type MonthRange, PASS_SCORE } from "@/lib/ilmunta/months";
import { seededRng } from "@/lib/ilmunta/random";
import { useTestsStore } from "@/lib/ilmunta/stores";
import { bestScore, type TestResult } from "@/lib/ilmunta/test-state";
import { AnswerFeedback } from "./answer-feedback";
import { ChooseAnswer, NextButton, TypeAnswer } from "./answer-input";
import { QuestionCard } from "./question-card";
import { useTestsReady } from "./use-synced-store";

interface Given {
  text: string;
  correct: boolean;
}

type Phase =
  | { kind: "intro" }
  | { kind: "run"; questions: ExamQuestion[]; given: Given[] }
  | { kind: "done"; questions: ExamQuestion[]; given: Given[] }
  | {
      kind: "retry";
      questions: ExamQuestion[];
      at: number;
      answered: Given | null;
    };

const promptOf = (q: ExamQuestion) => `${q.given.kanji} → ${q.target.label}`;

export function ExamRunner({ range }: { range: MonthRange }) {
  const ready = useTestsReady();
  const data = useTestsStore((s) => s.data);
  const add = useTestsStore((s) => s.add);
  const [phase, setPhase] = useState<Phase>({ kind: "intro" });

  const start = () =>
    setPhase({
      kind: "run",
      questions: buildExam(range, seededRng(Date.now())),
      given: [],
    });

  if (phase.kind === "intro") {
    const best = ready ? bestScore(data, range.month) : null;
    const lessons = examLessons(range);
    return (
      <div className="flex flex-col gap-5">
        <div>
          <p className="text-sm text-accent">{range.month}월 말 범위 시험</p>
          <h1 className="mt-1 text-2xl font-bold">
            {range.from}~{range.to}과
          </h1>
        </div>
        <ul className="flex flex-col gap-2 rounded-2xl bg-bg-raised p-5 text-sm">
          <li>30문제: 쓰기 15 + 고르기 15, 과마다 고르게</li>
          <li>{PASS_SCORE}점(27문제) 넘으면 목표 달성</li>
          <li>
            다루는 과: {lessons.join(", ")}과
            <span className="block text-ink-faint">
              활용으로 문제를 만들 수 있는 과만 낸다. 나머지 과(조사·부사·쓰임
              등)는 책의 연습 문제로 점검한다.
            </span>
          </li>
          <li>답은 끝난 뒤에 한꺼번에 보여 준다</li>
        </ul>
        {best !== null ? (
          <p className="text-sm text-ink-soft">
            지금까지 최고{" "}
            <b className={best >= PASS_SCORE ? "text-good" : "text-warn"}>
              {best}점
            </b>
          </p>
        ) : null}
        <button
          type="button"
          onClick={start}
          className="rounded-2xl bg-accent py-4 text-lg font-bold text-white"
        >
          시작
        </button>
      </div>
    );
  }

  if (phase.kind === "run") {
    const i = phase.given.length;
    const q = phase.questions[i];
    const answer = (text: string, correct: boolean) => {
      const given = [...phase.given, { text, correct }];
      if (given.length < phase.questions.length) {
        setPhase({ ...phase, given });
        return;
      }
      const s = scoreExam(given.map((g) => g.correct));
      const result: TestResult = {
        month: range.month,
        at: Date.now(),
        ...s,
        wrong: phase.questions.flatMap((qq, k) =>
          given[k].correct
            ? []
            : [
                {
                  prompt: promptOf(qq),
                  expected: qq.answer.kanji,
                  given: given[k].text,
                },
              ],
        ),
      };
      add(result);
      setPhase({ kind: "done", questions: phase.questions, given });
    };
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3 text-sm text-ink-soft">
          <span>
            {i + 1} / {phase.questions.length}
          </span>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-bg-raised">
            <div
              className="h-full rounded-full bg-accent transition-[width]"
              style={{ width: `${(i / phase.questions.length) * 100}%` }}
            />
          </div>
        </div>
        <QuestionCard q={q} />
        {q.mode === "choice" ? (
          <ChooseAnswer
            key={q.id}
            choices={q.choices}
            onPick={(c) =>
              answer(
                c.kanji,
                q.accepted.some((a) => a.reading === c.reading),
              )
            }
          />
        ) : (
          <TypeAnswer
            key={q.id}
            onSubmit={(t) =>
              answer(toKanaIfRomaji(t), isCorrectAnswer(t, q.accepted))
            }
          />
        )}
        <button
          type="button"
          onClick={() => answer("(모름)", false)}
          className="self-center text-sm text-ink-faint"
        >
          모르겠어요
        </button>
      </div>
    );
  }

  if (phase.kind === "done") {
    const s = scoreExam(phase.given.map((g) => g.correct));
    const wrong = phase.questions.filter((_, k) => !phase.given[k].correct);
    return (
      <div className="flex flex-col gap-5">
        <div className="rounded-2xl bg-bg-raised p-6 text-center">
          <p className="text-sm text-ink-soft">
            {range.month}월 범위 · {s.correct}/{s.total}
          </p>
          <p
            className={cn(
              "mt-1 text-6xl font-bold",
              s.passed ? "text-good" : "text-warn",
            )}
          >
            {s.score}
          </p>
          <ScoreBar score={s.score} />
          <p className="mt-3">
            {s.passed
              ? "목표 달성! 버즈 인증에 쓸 수 있어요."
              : `${PASS_SCORE}점까지 ${Math.ceil((PASS_SCORE / 100) * s.total) - s.correct}문제 더`}
          </p>
          <p className="mt-1 text-xs text-ink-faint">
            결과는 서버 기록(ilmunta-tests)에 남습니다.
          </p>
        </div>
        {wrong.length > 0 ? (
          <>
            <button
              type="button"
              onClick={() =>
                setPhase({
                  kind: "retry",
                  questions: wrong,
                  at: 0,
                  answered: null,
                })
              }
              className="rounded-2xl bg-accent py-4 font-bold text-white"
            >
              틀린 {wrong.length}문제 다시 풀기
            </button>
            <section className="flex flex-col gap-3">
              <h2 className="font-medium">틀린 문제</h2>
              {phase.questions.map((q, k) =>
                phase.given[k].correct ? null : (
                  <div key={q.id} className="flex flex-col gap-2">
                    <p className="text-sm text-ink-soft">
                      {k + 1}.{" "}
                      <span lang="ja" className="font-ja">
                        {q.given.kanji}
                      </span>{" "}
                      → {q.target.label}
                    </p>
                    <AnswerFeedback
                      q={q}
                      correct={false}
                      given={phase.given[k].text}
                    />
                  </div>
                ),
              )}
            </section>
          </>
        ) : null}
        <button
          type="button"
          onClick={start}
          className="rounded-2xl bg-bg-raised py-4"
        >
          새 시험지로 다시
        </button>
      </div>
    );
  }

  // 틀린 문제 다시 풀기: 바로바로 답을 보여 준다(점수에는 넣지 않는다)
  const q = phase.questions[phase.at];
  if (!q)
    return (
      <div className="flex flex-col gap-4 text-center">
        <p className="text-xl">틀린 문제를 다시 다 풀었어요.</p>
        <button
          type="button"
          onClick={start}
          className="rounded-2xl bg-accent py-4 font-bold text-white"
        >
          새 시험지로 다시
        </button>
      </div>
    );
  const answerRetry = (text: string, correct: boolean) =>
    setPhase({ ...phase, answered: { text, correct } });
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-ink-soft">
        다시 풀기 {phase.at + 1} / {phase.questions.length}
      </p>
      <QuestionCard q={q} />
      {phase.answered ? (
        <>
          <AnswerFeedback
            q={q}
            correct={phase.answered.correct}
            given={phase.answered.text}
          />
          <NextButton
            onClick={() =>
              setPhase({ ...phase, at: phase.at + 1, answered: null })
            }
          />
        </>
      ) : (
        <TypeAnswer
          key={q.id}
          onSubmit={(t) =>
            answerRetry(toKanaIfRomaji(t), isCorrectAnswer(t, q.accepted))
          }
        />
      )}
    </div>
  );
}

/** 점수 막대와 90점 선 */
function ScoreBar({ score }: { score: number }) {
  return (
    <div className="relative mt-4 h-3 rounded-full bg-bg-sunken">
      <div
        className={cn(
          "h-full rounded-full",
          score >= PASS_SCORE ? "bg-good" : "bg-warn",
        )}
        style={{ width: `${score}%` }}
      />
      <div
        className="absolute -top-1 h-5 w-0.5 bg-ink"
        style={{ left: `${PASS_SCORE}%` }}
        aria-hidden
      />
    </div>
  );
}
