"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SplitColumns } from "@/components/shell/page-frame";
import { cn } from "@/lib/cn";
import { isCorrectAnswer, toKanaIfRomaji } from "@/lib/ilmunta/check";
import {
  DRILL_LESSONS,
  type Skill,
  skillLabel,
  skillsInLessons,
  skillsOfLesson,
} from "@/lib/ilmunta/curriculum";
import { type Question, wordOf } from "@/lib/ilmunta/question";
import { type Rng, seededRng } from "@/lib/ilmunta/random";
import { makeDrillQuestion, type QuestionStyle } from "@/lib/ilmunta/sentence";
import { useDrillStore } from "@/lib/ilmunta/stores";
import { pickSkill, weakestSkills } from "@/lib/ilmunta/weakness";
import { AnswerFeedback } from "./answer-feedback";
import { ChooseAnswer, NextButton, TypeAnswer } from "./answer-input";
import { QuestionCard } from "./question-card";
import { SentenceCard } from "./sentence-card";
import { useDrillReady } from "./use-synced-store";

const SPRINT_SEC = 60;
const AUTO_NEXT_MS = 650;

type Mode = "practice" | "sprint";
interface Answered {
  correct: boolean;
  given: string;
  picked?: { kanji: string; reading: string };
}

/** 과 번호 → 그 과에서 처음 열리는 것의 이름(범위 고르기 보기에 붙인다) */
function lessonHint(no: number): string {
  const first = skillsOfLesson(no).find((s) => Math.min(...s.lessons) === no);
  return first ? skillLabel(first).split(" · ")[0] : "복습";
}

export function DrillApp({
  onlyLesson,
  reviewUpTo,
}: {
  onlyLesson?: number;
  /** 활용이 없는 과에서 왔으면 그 과까지 나온 활용을 섞는다(저장한 범위는 건드리지 않는다) */
  reviewUpTo?: number;
}) {
  const ready = useDrillReady();
  if (!ready)
    return (
      <p
        lang="ja"
        className="py-20 text-center font-ja text-4xl text-ink-faint"
      >
        …
      </p>
    );
  return <DrillSession onlyLesson={onlyLesson} reviewUpTo={reviewUpTo} />;
}

function DrillSession({
  onlyLesson,
  reviewUpTo,
}: {
  onlyLesson?: number;
  reviewUpTo?: number;
}) {
  const prefs = useDrillStore((s) => s.prefs);
  const setPrefs = useDrillStore((s) => s.setPrefs);
  const states = useDrillStore((s) => s.data.skills);
  const bests = useDrillStore((s) => s.data.bests);
  const answerSkill = useDrillStore((s) => s.answer);
  const recordBest = useDrillStore((s) => s.recordBest);

  const skills: Skill[] = useMemo(
    () =>
      onlyLesson
        ? skillsOfLesson(onlyLesson)
        : skillsInLessons(1, reviewUpTo ?? prefs.maxLesson),
    [onlyLesson, reviewUpTo, prefs.maxLesson],
  );

  const style: QuestionStyle = prefs.questionStyle ?? "sentence";
  // 이 과까지 배운 낱말만 문제에 쓴다
  const upTo = onlyLesson ?? reviewUpTo ?? prefs.maxLesson;
  const rng = useRef<Rng>(seededRng(Date.now()));
  const next = useCallback(
    (prev?: Question): Question => {
      const s = useDrillStore.getState().data.skills;
      const skill = pickSkill(
        skills,
        s,
        Date.now(),
        rng.current,
        prev?.skillKey,
      );
      return makeDrillQuestion(
        skill,
        style,
        rng.current,
        prev ? wordOf(prev.id) : undefined,
        upTo,
      );
    },
    [skills, style, upTo],
  );

  const [q, setQ] = useState<Question>(() => next());
  const [answered, setAnswered] = useState<Answered | null>(null);
  const [streak, setStreak] = useState(0);
  const [mode, setMode] = useState<Mode>("practice");
  const [sprint, setSprint] = useState<{
    endsAt: number;
    score: number;
  } | null>(null);
  const [sprintResult, setSprintResult] = useState<{
    score: number;
    isNew: boolean;
  } | null>(null);
  const [now, setNow] = useState(() => Date.now());

  // 범위가 바뀌면 새 문제로
  useEffect(() => {
    setQ(next());
    setAnswered(null);
  }, [next]);

  // 60초 모드 시계
  useEffect(() => {
    if (!sprint) return;
    const t = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(t);
  }, [sprint]);
  useEffect(() => {
    if (sprint && now >= sprint.endsAt) {
      const isNew = recordBest("sprint", sprint.score);
      setSprintResult({ score: sprint.score, isNew });
      setSprint(null);
      setMode("practice");
    }
  }, [now, sprint, recordBest]);

  const advance = useCallback(() => {
    setQ((prev) => next(prev));
    setAnswered(null);
  }, [next]);

  const submit = (given: string, picked?: Answered["picked"]) => {
    if (answered) return;
    const correct = picked
      ? q.accepted.some((a) => a.reading === picked.reading)
      : isCorrectAnswer(given, q.accepted);
    answerSkill(q.skillKey, correct);
    const nextStreak = correct ? streak + 1 : 0;
    setStreak(nextStreak);
    if (correct) recordBest("streak", nextStreak);
    if (sprint && correct) setSprint({ ...sprint, score: sprint.score + 1 });
    setAnswered({ correct, given, picked });
  };

  // 맞히면 잠깐 보여 주고 저절로 다음 문제로(손맛). 틀리면 규칙을 읽고 넘긴다
  useEffect(() => {
    if (!answered?.correct) return;
    const t = setTimeout(advance, sprint ? 250 : AUTO_NEXT_MS);
    return () => clearTimeout(t);
  }, [answered, advance, sprint]);

  const startSprint = () => {
    setSprintResult(null);
    setStreak(0);
    setMode("sprint");
    setSprint({ endsAt: Date.now() + SPRINT_SEC * 1000, score: 0 });
    setNow(Date.now());
    advance();
  };

  const weak = weakestSkills(skills, states, 4);
  const left = sprint
    ? Math.max(0, Math.ceil((sprint.endsAt - now) / 1000))
    : 0;

  return (
    <SplitColumns
      main={
        <DrillMain>
          <div className="flex items-center justify-between gap-2 text-sm">
            {onlyLesson ? (
              <span className="rounded-full bg-bg-raised px-3 py-1.5">
                {onlyLesson}과만 ·{" "}
                <Link href="/ilmunta/drill" className="text-accent">
                  범위 넓히기
                </Link>
              </span>
            ) : reviewUpTo ? (
              <span className="rounded-full bg-bg-raised px-3 py-1.5">
                1~{reviewUpTo}과 복습 ·{" "}
                <Link href="/ilmunta/drill" className="text-accent">
                  범위 바꾸기
                </Link>
              </span>
            ) : (
              <label className="flex min-w-0 items-center gap-2">
                <span className="whitespace-nowrap text-ink-soft">범위</span>
                <select
                  value={prefs.maxLesson}
                  onChange={(e) =>
                    setPrefs({ maxLesson: Number(e.target.value) })
                  }
                  className="min-w-0 rounded-full bg-bg-raised px-3 py-1.5"
                >
                  {DRILL_LESSONS.map((n) => (
                    <option key={n} value={n}>
                      1~{n}과 ({lessonHint(n)})
                    </option>
                  ))}
                </select>
              </label>
            )}
            <fieldset className="flex shrink-0 overflow-hidden rounded-full bg-bg-raised whitespace-nowrap">
              <legend className="sr-only">답하는 방식</legend>
              {(["type", "choose"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setPrefs({ answerMode: m })}
                  className={cn(
                    "px-3 py-1.5",
                    prefs.answerMode === m
                      ? "bg-accent text-white"
                      : "text-ink-soft",
                  )}
                >
                  {m === "type" ? "쓰기" : "고르기"}
                </button>
              ))}
            </fieldset>
          </div>

          <fieldset className="flex self-start overflow-hidden rounded-full bg-bg-raised text-sm whitespace-nowrap">
            <legend className="sr-only">문제 방식</legend>
            {(["sentence", "table"] as const).map((m) => (
              <button
                key={m}
                type="button"
                aria-pressed={style === m}
                onClick={() => setPrefs({ questionStyle: m })}
                className={cn(
                  "px-3 py-1.5",
                  style === m ? "bg-accent text-white" : "text-ink-soft",
                )}
              >
                {m === "sentence" ? "문장 속 빈칸" : "활용표만 빠르게"}
              </button>
            ))}
          </fieldset>

          <div className="flex items-center justify-between rounded-2xl bg-bg-raised px-4 py-3">
            <span>
              <span className="text-2xl font-bold">{streak}</span>
              <span className="ml-1 text-sm text-ink-soft">연속</span>
              <span className="ml-2 text-xs text-ink-faint">
                최고 {bests.streak}
              </span>
            </span>
            {mode === "sprint" && sprint ? (
              <span className="text-right">
                <span
                  className={cn(
                    "text-2xl font-bold",
                    left <= 10 && "text-accent",
                  )}
                >
                  {left}초
                </span>
                <span className="ml-2 text-sm text-ink-soft">
                  {sprint.score}개
                </span>
              </span>
            ) : (
              <button
                type="button"
                onClick={startSprint}
                className="rounded-full bg-accent px-4 py-1.5 text-sm font-bold text-white"
              >
                60초 도전 · 최고 {bests.sprint}
              </button>
            )}
          </div>

          {sprintResult ? (
            <p className="rounded-2xl bg-good/10 p-4 text-center">
              60초 동안 <b>{sprintResult.score}개</b> 맞힘
              {sprintResult.isNew ? " · 새 최고 기록!" : ""}
            </p>
          ) : null}

          {q.sentence ? (
            <SentenceCard key={q.id} q={q} sentence={q.sentence} />
          ) : (
            <QuestionCard q={q} />
          )}

          {answered ? (
            <AnswerFeedback
              q={q}
              correct={answered.correct}
              given={
                answered.picked ? undefined : toKanaIfRomaji(answered.given)
              }
            />
          ) : null}

          {prefs.answerMode === "choose" ? (
            <>
              <ChooseAnswer
                choices={q.choices}
                disabled={!!answered}
                picked={answered?.picked}
                correct={answered ? q.answer : null}
                onPick={(c) => submit(c.kanji, c)}
                numbered
              />
              {answered && !answered.correct ? (
                <NextButton onClick={advance} />
              ) : null}
            </>
          ) : (
            // 입력칸은 문제가 바뀌어도 그대로 둔다(휴대폰 자판이 닫히지 않게)
            <TypeAnswer
              onSubmit={(t) => submit(t)}
              locked={!!answered}
              onNext={answered && !answered.correct ? advance : undefined}
            />
          )}
        </DrillMain>
      }
      side={
        <>
          <KeyboardHint mode={prefs.answerMode} />
          {style === "sentence" ? <SentenceClues /> : null}
          {weak.length > 0 ? (
            <section className="mt-4 lg:mt-0 lg:rounded-2xl lg:bg-bg-raised lg:p-5">
              <h2 className="text-sm text-ink-soft">자주 틀리는 활용</h2>
              <ul className="mt-2 flex flex-wrap gap-2">
                {weak.map((w) => (
                  <li
                    key={w.skill.key}
                    lang="ja"
                    className="rounded-full bg-bg-raised px-3 py-1 text-sm"
                  >
                    {skillLabel(w.skill)}{" "}
                    <span className="text-accent">
                      {Math.round(w.rate * 100)}%
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-ink-faint">
                틀린 활용은 10분 뒤, 맞힌 활용은 하루·이틀·나흘… 뒤에 다시
                나옵니다.
              </p>
            </section>
          ) : null}
        </>
      }
    />
  );
}

/** 문제 쪽 몸통. PC에서는 문제 카드를 크게 받치는 판 위에 둔다 */
function DrillMain({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-5 lg:rounded-3xl lg:bg-bg-sunken lg:p-8">
      {children}
    </div>
  );
}

/** PC 곁칸: 문장 속에서 활용형을 알려 주는 말(폰에서는 감춘다) */
function SentenceClues() {
  const clues = [
    ["昨日 · 前は · 昔", "과거"],
    ["先生、 · ～です · ～ます", "정중체"],
    ["ねえ、 · ～だけど · ～から", "보통체"],
    ["あまり · 뒤 문장", "부정"],
  ];
  return (
    <section className="hidden rounded-2xl border border-line p-5 lg:block">
      <h2 className="text-sm text-ink-soft">문장이 알려 주는 것</h2>
      <dl className="mt-3 space-y-2 text-sm">
        {clues.map(([ja, ko]) => (
          <div key={ko} className="flex items-baseline gap-3">
            <dt lang="ja" className="font-ja">
              {ja}
            </dt>
            <dd className="text-ink-soft">→ {ko}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/** PC 곁칸: 키보드로 푸는 법(폰에서는 감춘다) */
function KeyboardHint({ mode }: { mode: "type" | "choose" }) {
  const keys =
    mode === "type"
      ? [
          ["Enter", "확인 · 틀렸으면 다음 문제"],
          ["Tab", "확인 단추로 옮겨 가기"],
          ["romaji", "입력기 없이 로마자로 쳐도 가나로 바꿔 채점"],
        ]
      : [
          ["1~4", "보기 고르기"],
          ["Enter", "틀렸으면 다음 문제"],
        ];
  return (
    <section className="hidden rounded-2xl border border-line p-5 lg:block">
      <h2 className="text-sm text-ink-soft">키보드로 풀기</h2>
      <dl className="mt-3 space-y-2 text-sm">
        {keys.map(([k, label]) => (
          <div key={k} className="flex items-center gap-3">
            <dt>
              <kbd className="rounded-md border border-line bg-bg-sunken px-2 py-0.5 font-mono text-xs">
                {k}
              </kbd>
            </dt>
            <dd className="text-ink-soft">{label}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
