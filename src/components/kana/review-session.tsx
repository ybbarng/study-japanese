"use client";

import Link from "next/link";
import { useState } from "react";
import { KeyHelp } from "@/components/keyboard/key-help";
import { type CardId, cardChar, hasAudio, parseCardId } from "@/lib/kana/data";
import { chartViewFor } from "@/lib/kana/lesson-side";
import { makeQuestion, type Question } from "@/lib/kana/quiz";
import { type CardState, dueQueue } from "@/lib/kana/srs";
import { useKanaStore } from "@/lib/kana/store";
import s from "./kana.module.css";
import { type Answered, AnsweredPanel, CharChart } from "./lesson-side";
import { type QuizResult, QuizRunner } from "./quiz-runner";
import { cn, Glyph, PrimaryButton, Screen, SecondaryButton } from "./ui";

/** 오늘 복습: 마지막에 틀린 글자, 잊을 때가 된 글자 순으로 최대 20개 */
export function ReviewSession() {
  const answer = useKanaStore((st) => st.answer);
  const [questions] = useState<Question[]>(() => {
    // 저장된 카드만 들어 있으므로 비어 있는 값은 없다
    const cards = useKanaStore.getState().cards as Record<CardId, CardState>;
    const learned = Object.keys(cards) as CardId[];
    return dueQueue(cards, Date.now(), 20).map((id, i) => {
      const { script, soundId } = parseCardId(id);
      const pool = learned.filter((c) => parseCardId(c).script === script);
      const kind =
        hasAudio(soundId) && i % 2 === 0 ? "sound-to-char" : "char-to-sound";
      return makeQuestion(id, pool, kind, Math.random);
    });
  });
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<QuizResult | null>(null);
  const [answered, setAnswered] = useState<Answered[]>([]);
  // 복습할 글자(겹치지 않게, 나온 차례대로). 다 풀기 전에는 읽는 법을 가린다
  const [queueCards] = useState(() => [
    ...new Set(questions.map((q) => q.answer)),
  ]);

  /** PC 곁칸: 푼 글자, 오늘 복습할 글자, 키보드 */
  const aside = (finished: boolean) => (
    <>
      <AnsweredPanel answered={answered} total={questions.length} />
      <CharChart
        title={`오늘 복습할 글자 ${queueCards.length}자`}
        cards={queueCards}
        current={null}
        view={chartViewFor(finished ? "done" : "quiz")}
      />
      {!finished && (
        <KeyHelp
          items={[
            { key: "1~4", label: "보기 고르기" },
            { key: "Enter", label: "틀린 뒤 다음 문제" },
          ]}
        />
      )}
    </>
  );

  if (questions.length === 0) {
    return (
      <Screen title="오늘 복습">
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
          <Glyph className="text-7xl text-good">◎</Glyph>
          <h2 className="text-2xl font-bold">지금은 복습할 글자가 없어요</h2>
          <p className="text-ink-soft">
            익힌 글자는 잊을 때쯤 다시 나와요.
            <br />
            그동안 게임으로 손을 풀어 볼까요?
          </p>
          <div className="flex w-full flex-col gap-3 pt-6">
            <Link href="/kana/game/rush">
              <PrimaryButton tabIndex={-1}>빠르게 읽기</PrimaryButton>
            </Link>
            <Link href="/kana">
              <SecondaryButton tabIndex={-1}>가나 홈</SecondaryButton>
            </Link>
          </div>
        </div>
      </Screen>
    );
  }

  if (result) {
    return (
      <Screen
        title="오늘 복습"
        aside={aside(true)}
        asideLabel="복습 진행과 푼 글자"
      >
        <div className="flex flex-1 flex-col items-center justify-center gap-5 text-center">
          <p className={cn("text-6xl font-bold text-accent", s.pop)}>
            {result.correct} / {result.total}
          </p>
          <h2 className="text-2xl font-bold">복습 끝!</h2>
          {result.bestCombo >= 3 && (
            <p className="text-ink-soft">최고 {result.bestCombo} 연속</p>
          )}
          {result.missed.length > 0 && (
            <p className="text-sm text-ink-soft">
              다시 볼 글자{" "}
              <span lang="ja" className="text-lg text-ink">
                {result.missed.map(cardChar).join(" ")}
              </span>
            </p>
          )}
          <div className="flex w-full flex-col gap-3 pt-6">
            <Link href="/kana">
              <PrimaryButton tabIndex={-1}>가나 홈</PrimaryButton>
            </Link>
            <Link href="/kana/game/rush">
              <SecondaryButton tabIndex={-1}>빠르게 읽기 게임</SecondaryButton>
            </Link>
          </div>
        </div>
      </Screen>
    );
  }

  return (
    <Screen
      progress={progress}
      aside={aside(false)}
      asideLabel="복습 진행과 푼 글자"
    >
      <p className="pt-3 text-center text-sm text-ink-faint">
        오늘 복습 · {questions.length}글자
      </p>
      <QuizRunner
        questions={questions}
        onAnswer={(id, ok) => {
          answer(id, ok);
          setAnswered((a) => [...a, { id, ok }]);
        }}
        onProgress={setProgress}
        onDone={setResult}
      />
    </Screen>
  );
}
