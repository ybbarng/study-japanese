"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { KeyHelp } from "@/components/keyboard/key-help";
import {
  type CardId,
  cardChar,
  getSound,
  hasAudio,
  parseCardId,
} from "@/lib/kana/data";
import {
  chartViewFor,
  INTRO_KEY_HELP,
  lessonConfusables,
  showCompare,
} from "@/lib/kana/lesson-side";
import { LESSON_BY_ID, LESSONS, lessonCards } from "@/lib/kana/lessons";
import { makeQuiz, shuffle } from "@/lib/kana/quiz";
import { useKanaStore } from "@/lib/kana/store";
import { IntroStep } from "./intro-step";
import s from "./kana.module.css";
import {
  type Answered,
  AnsweredPanel,
  CharChart,
  ComparePanel,
  LessonProgressPanel,
} from "./lesson-side";
import { type QuizResult, QuizRunner } from "./quiz-runner";
import { TypeStep } from "./type-step";
import { cn, Glyph, PrimaryButton, Screen, SecondaryButton } from "./ui";
import { WordsStep } from "./words-step";
import { WritePad } from "./write-pad";

const STEPS = [
  { key: "intro", label: "소개" },
  { key: "quiz", label: "알아보기" },
  { key: "write", label: "쓰기" },
  { key: "words", label: "낱말 읽기" },
  { key: "type", label: "입력" },
] as const;
type StepKey = (typeof STEPS)[number]["key"] | "done";

/** PC 곁칸 "키보드로 하기": 단계마다 받는 키 */
function keyHelpFor(step: StepKey): { key: string; label: string }[] {
  if (step === "intro") return INTRO_KEY_HELP;
  if (step === "quiz")
    return [
      { key: "1~4", label: "보기 고르기" },
      { key: "Enter", label: "틀린 뒤 다음 문제" },
    ];
  if (step === "type") return [{ key: "Enter", label: "입력한 답 맞춰 보기" }];
  return [{ key: "Tab", label: "단추 사이 옮기기 · Enter로 누르기" }];
}

/** 기본 글자는 모두 쓰고, 탁음·요음 등은 고르게 다섯 개만 쓴다(바탕 글자를 이미 썼으므로). */
function pickWriting<T>(items: T[], isBasic: boolean): T[] {
  if (isBasic || items.length <= 5) return items;
  const step = items.length / 5;
  return Array.from({ length: 5 }, (_, k) => items[Math.floor(k * step)]);
}

export function LessonRunner({ lessonId }: { lessonId: string }) {
  const lesson = LESSON_BY_ID.get(lessonId);
  if (!lesson) throw new Error(`없는 레슨: ${lessonId}`);
  const introduce = useKanaStore((st) => st.introduce);
  const answer = useKanaStore((st) => st.answer);
  const completeLesson = useKanaStore((st) => st.completeLesson);

  const cards = useMemo(() => lessonCards(lesson), [lesson]);
  const withAudio = cards.some((c) => hasAudio(parseCardId(c).soundId));
  const isBasic = getSound(lesson.sounds[0]).kind === "basic";

  const [step, setStep] = useState<StepKey>("intro");
  const [sub, setSub] = useState(0);
  const [quizResult, setQuizResult] = useState<QuizResult | null>(null);
  const [wordsRead, setWordsRead] = useState(0);
  const [writeIndex, setWriteIndex] = useState(0);

  const quiz = useMemo(
    () =>
      makeQuiz(cards, Math.min(cards.length * 2, 20), Math.random, withAudio),
    [cards, withAudio],
  );
  const writing = useMemo(() => pickWriting(cards, isBasic), [cards, isBasic]);
  const readWords = useMemo(
    () => shuffle(lesson.words, Math.random).slice(0, 8),
    [lesson.words],
  );
  const typeWords = useMemo(() => readWords.slice(0, 4), [readWords]);

  const stepIndex = STEPS.findIndex((x) => x.key === step);
  const progress =
    step === "done" ? 1 : (stepIndex + Math.min(sub, 0.99)) / STEPS.length;
  const onProgress = useCallback((f: number) => setSub(f), []);
  const goto = (k: StepKey) => {
    setSub(0);
    setStep(k);
  };

  const lessonIndex = LESSONS.findIndex((l) => l.id === lesson.id);
  const nextLesson = LESSONS[lessonIndex + 1];

  // PC 곁칸: 지금 글자, 퀴즈에서 푼 글자, 앞 레슨까지 배운 글자(비교할 짝 고르기)
  const [introCard, setIntroCard] = useState<CardId | null>(null);
  const [answered, setAnswered] = useState<Answered[]>([]);
  const storeCards = useKanaStore((st) => st.cards);
  const learned = useMemo(
    () => new Set(Object.keys(storeCards) as CardId[]),
    [storeCards],
  );
  const pairs = useMemo(
    () => lessonConfusables(cards, learned),
    [cards, learned],
  );
  const doneLessons = useKanaStore((st) => Object.keys(st.lessons).length);
  const current =
    step === "intro"
      ? introCard
      : step === "write"
        ? (writing[writeIndex] ?? null)
        : null;
  const written = useMemo(
    () => new Set(writing.slice(0, writeIndex)),
    [writing, writeIndex],
  );
  const scriptName = lesson.script === "hira" ? "히라가나" : "가타카나";

  const aside = (
    <>
      <LessonProgressPanel
        title={`${scriptName} · ${lesson.title}`}
        position={lessonIndex + 1}
        total={LESSONS.length}
        done={doneLessons}
      />
      {step === "quiz" && (
        <AnsweredPanel answered={answered} total={quiz.length} />
      )}
      <CharChart
        title={`이 레슨 ${scriptName} ${cards.length}자`}
        cards={cards}
        current={current}
        view={chartViewFor(step)}
        written={written}
      />
      {showCompare(step) && <ComparePanel pairs={pairs} current={current} />}
      <KeyHelp items={keyHelpFor(step)} />
    </>
  );

  return (
    <Screen
      aside={aside}
      asideLabel="레슨 진도와 글자표"
      progress={progress}
      footer={
        step !== "done" && (
          <div className="flex justify-center gap-1.5 text-xs">
            {STEPS.map((x, k) => (
              <span
                key={x.key}
                className={cn(
                  "rounded-full px-2 py-0.5",
                  k === stepIndex
                    ? "bg-accent-soft text-accent"
                    : k < stepIndex
                      ? "text-ink-soft"
                      : "text-ink-faint",
                )}
              >
                {x.label}
              </span>
            ))}
          </div>
        )
      }
    >
      <p className="pt-3 pb-2 text-center text-sm text-ink-faint">
        {lesson.script === "hira" ? "히라가나" : "가타카나"} · {lesson.title}
      </p>

      {step === "intro" && (
        <IntroStep
          lesson={lesson}
          cards={cards}
          onProgress={onProgress}
          onCard={setIntroCard}
          onDone={() => {
            introduce(cards);
            goto("quiz");
          }}
        />
      )}

      {step === "quiz" && (
        <QuizRunner
          questions={quiz}
          onAnswer={(id, ok) => {
            answer(id, ok);
            setAnswered((a) => [...a, { id, ok }]);
          }}
          onProgress={onProgress}
          onDone={(r) => {
            setQuizResult(r);
            goto("write");
          }}
        />
      )}

      {step === "write" && (
        <div className="flex flex-1 flex-col">
          <WritePad
            key={writing[writeIndex]}
            char={cardChar(writing[writeIndex])}
            romaji={getSound(parseCardId(writing[writeIndex]).soundId).ko}
            onGrade={(ok) => {
              answer(writing[writeIndex], ok);
              if (!ok) return;
              if (writeIndex + 1 >= writing.length) goto("words");
              else {
                setWriteIndex(writeIndex + 1);
                setSub((writeIndex + 1) / writing.length);
              }
            }}
          />
          <p className="pt-2 text-center text-xs text-ink-faint">
            {writeIndex + 1} / {writing.length}
          </p>
        </div>
      )}

      {step === "words" && (
        <WordsStep
          words={readWords}
          onProgress={onProgress}
          onDone={(n) => {
            setWordsRead(n);
            goto("type");
          }}
        />
      )}

      {step === "type" && (
        <TypeStep
          words={typeWords}
          onProgress={onProgress}
          onDone={() => {
            completeLesson(lesson.id);
            goto("done");
          }}
        />
      )}

      {step === "done" && (
        <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
          <div className={cn("flex flex-wrap justify-center gap-2", s.pop)}>
            {cards.slice(0, 12).map((c) => (
              <Glyph key={c} className="text-3xl text-accent">
                {cardChar(c)}
              </Glyph>
            ))}
          </div>
          <h2 className="text-3xl font-bold">레슨 끝!</h2>
          <ul className="space-y-1 text-ink-soft">
            {quizResult && (
              <li>
                알아보기 {quizResult.correct} / {quizResult.total}
                {quizResult.bestCombo >= 3 &&
                  ` · 최고 ${quizResult.bestCombo} 연속`}
              </li>
            )}
            <li>
              낱말 {wordsRead} / {readWords.length}개 읽음
            </li>
          </ul>
          {quizResult && quizResult.missed.length > 0 && (
            <p className="text-sm text-ink-faint">
              헷갈린 글자{" "}
              <span lang="ja" className="text-ink-soft">
                {quizResult.missed.map(cardChar).join(" ")}
              </span>
              는 오늘 복습에 먼저 나와요
            </p>
          )}
          <div className="flex w-full flex-col gap-3 pt-6">
            {nextLesson ? (
              <Link href={`/kana/lesson/${nextLesson.id}`} className="block">
                <PrimaryButton tabIndex={-1}>
                  다음 레슨 · {nextLesson.title}
                </PrimaryButton>
              </Link>
            ) : (
              <Link href="/kana/game/rush" className="block">
                <PrimaryButton tabIndex={-1}>빠르게 읽기 게임</PrimaryButton>
              </Link>
            )}
            <Link href="/kana" className="block">
              <SecondaryButton tabIndex={-1}>가나 홈</SecondaryButton>
            </Link>
          </div>
        </div>
      )}
    </Screen>
  );
}
