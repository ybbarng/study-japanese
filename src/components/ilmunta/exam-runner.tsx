"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";
import { InlineKey, KeyHelp, SidePanel } from "@/components/keyboard/key-help";
import { TwoColumn } from "@/components/shell/page-frame";
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
    const past = ready
      ? data.results
          .filter((r) => r.month === range.month)
          .slice(-6)
          .reverse()
      : [];
    return (
      <ExamColumns
        asideLabel="지난 시험 기록"
        aside={
          <>
            <SidePanel title="지난 기록">
              {past.length === 0 ? (
                <p className="text-sm text-ink-faint">
                  아직 이 범위 시험을 본 적이 없어요.
                </p>
              ) : (
                <ul className="flex flex-col gap-2 text-sm">
                  {past.map((r) => (
                    <li key={r.at} className="flex items-baseline gap-3">
                      <span className="text-ink-soft">{dateLabel(r.at)}</span>
                      <b className={r.passed ? "text-good" : "text-warn"}>
                        {r.score}점
                      </b>
                      <span className="text-xs text-ink-faint">
                        틀림 {r.wrong.length}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </SidePanel>
            <KeyHelp
              items={[
                { key: "Enter", label: "시작 · 쓰기 문제 확인" },
                { key: "1~4", label: "고르기 문제 보기 고르기" },
              ]}
            />
          </>
        }
      >
        <div className="flex flex-col gap-5 lg:max-w-2xl">
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
          <FocusedButton
            onClick={start}
            className="rounded-2xl bg-accent py-4 text-lg font-bold text-white"
          >
            시작
            <InlineKey k="Enter" onAccent />
          </FocusedButton>
        </div>
      </ExamColumns>
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
      <ExamColumns
        asideLabel="시험 진행"
        aside={
          <>
            <SidePanel title={`남은 문제 ${phase.questions.length - i}개`}>
              <ProgressGrid
                total={phase.questions.length}
                current={i}
                modes={phase.questions.map((qq) => qq.mode)}
              />
            </SidePanel>
            <SidePanel title="규칙">
              <ul className="flex flex-col gap-1.5 text-sm text-ink-soft">
                <li>{PASS_SCORE}점 넘으면 목표 달성</li>
                <li>쓰기와 고르기가 번갈아 나온다</li>
                <li>답은 끝난 뒤에 한꺼번에 보여 준다</li>
                <li>모르면 넘겨도 된다(틀린 것으로 센다)</li>
              </ul>
            </SidePanel>
            <KeyHelp
              items={
                q.mode === "choice"
                  ? [
                      { key: "1~4", label: "보기 고르기" },
                      { key: "Tab", label: "모르겠어요로 옮겨 가기" },
                    ]
                  : [
                      { key: "Enter", label: "확인" },
                      { key: "romaji", label: "로마자로 쳐도 가나로 채점" },
                      { key: "Tab", label: "확인·모르겠어요로 옮겨 가기" },
                    ]
              }
            />
          </>
        }
      >
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
          <QuestionPanel>
            <QuestionCard q={q} />
            {q.mode === "choice" ? (
              <ChooseAnswer
                key={q.id}
                numbered
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
          </QuestionPanel>
        </div>
      </ExamColumns>
    );
  }

  if (phase.kind === "done") {
    const s = scoreExam(phase.given.map((g) => g.correct));
    const wrong = phase.questions.filter((_, k) => !phase.given[k].correct);
    // 폰: 점수 → 다시 풀기 → 틀린 문제 → 새 시험지 순으로 쌓는다(왼쪽 묶음은 contents라
    // 폰에서는 묶음이 없는 것처럼 하나씩 쌓이고, 새 시험지 단추만 order로 맨 끝에 간다).
    // PC: 왼쪽에 따라오는 점수와 단추들, 오른쪽에 틀린 문제 목록
    return (
      <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[22rem_minmax(0,1fr)] lg:items-start lg:gap-10">
        <div className="contents lg:sticky lg:top-10 lg:flex lg:flex-col lg:gap-5">
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
            <FocusedButton
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
              <InlineKey k="Enter" onAccent />
            </FocusedButton>
          ) : null}
          <button
            type="button"
            onClick={start}
            className="order-last rounded-2xl bg-bg-raised py-4 lg:order-none"
          >
            새 시험지로 다시
          </button>
        </div>
        {wrong.length > 0 ? (
          <section className="flex flex-col gap-3 lg:col-start-2 lg:row-start-1">
            <h2 className="hidden text-sm text-ink-soft lg:block">
              틀린 문제 {wrong.length}개 · 정답과 규칙
            </h2>
            <h2 className="font-medium lg:hidden">틀린 문제</h2>
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
        ) : null}
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
    <ExamColumns
      asideLabel="다시 풀기 진행"
      aside={
        <>
          <SidePanel
            title={`다시 풀기 · 남은 문제 ${phase.questions.length - phase.at}개`}
          >
            <p className="text-sm text-ink-soft">
              틀린 문제만 다시 풉니다. 바로바로 정답을 보여 주고, 점수에는 넣지
              않아요.
            </p>
          </SidePanel>
          <KeyHelp
            items={[
              { key: "Enter", label: "확인 · 다음 문제" },
              { key: "romaji", label: "로마자로 쳐도 가나로 채점" },
            ]}
          />
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <p className="text-sm text-ink-soft">
          다시 풀기 {phase.at + 1} / {phase.questions.length}
        </p>
        <QuestionPanel>
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
        </QuestionPanel>
      </div>
    </ExamColumns>
  );
}

/** 나타나면 초점을 받아 Enter로 바로 누르는 단추(초점 때문에 화면이 밀리지 않게) */
function FocusedButton({
  onClick,
  className,
  children,
}: {
  onClick: () => void;
  className: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    ref.current?.focus({ preventScroll: true });
  }, []);
  return (
    <button ref={ref} type="button" onClick={onClick} className={className}>
      {children}
    </button>
  );
}

/** PC에서 왼쪽 문제·오른쪽 곁칸(진행·규칙·키). 폰에서는 곁칸 없이 문제만 */
function ExamColumns({
  aside,
  asideLabel,
  children,
}: {
  aside: ReactNode;
  asideLabel: string;
  children: ReactNode;
}) {
  return (
    <TwoColumn
      main={children}
      aside={aside}
      asideLabel={asideLabel}
      asideWidth="20rem"
    />
  );
}

/** 문제 쪽 몸통. PC에서는 문제 카드를 크게 받치는 판 위에 둔다(활용 드릴과 같은 모양) */
function QuestionPanel({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col gap-4 lg:gap-5 lg:rounded-3xl lg:bg-bg-sunken lg:p-8">
      {children}
    </div>
  );
}

/** 시험지 칸: 푼 문제는 채우고 지금 문제는 테를 두른다(맞았는지는 끝나고 보여 준다) */
function ProgressGrid({
  total,
  current,
  modes,
}: {
  total: number;
  current: number;
  modes: ExamQuestion["mode"][];
}) {
  return (
    <div>
      <ol className="grid grid-cols-6 gap-1.5">
        {Array.from({ length: total }, (_, k) => (
          <li
            // biome-ignore lint/suspicious/noArrayIndexKey: 시험지 칸은 번호가 곧 자리다
            key={k}
            aria-current={k === current ? "step" : undefined}
            className={cn(
              "grid h-8 place-items-center rounded-md border text-xs",
              k < current && "border-transparent bg-bg-raised text-ink-faint",
              k === current && "border-accent font-bold text-accent",
              k > current && "border-line text-ink-soft",
              modes[k] === "choice" && "rounded-full",
            )}
          >
            {k + 1}
          </li>
        ))}
      </ol>
      <p className="mt-3 text-xs text-ink-faint">
        네모는 쓰기, 동그라미는 고르기 문제
      </p>
    </div>
  );
}

function dateLabel(at: number): string {
  const d = new Date(at);
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
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
