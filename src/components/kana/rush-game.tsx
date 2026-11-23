"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useChoiceKeys } from "@/components/keyboard/key-input";
import { type CardId, cardChar, getSound, parseCardId } from "@/lib/kana/data";
import {
  gamePool,
  type RushMode,
  rushFallMs,
  rushPoints,
} from "@/lib/kana/games";
import { makeQuestion, type Question } from "@/lib/kana/quiz";
import { useKanaStore } from "@/lib/kana/store";
import { playSound } from "./audio";
import s from "./kana.module.css";
import {
  ChoiceKey,
  cn,
  Glyph,
  PrimaryButton,
  Screen,
  SecondaryButton,
} from "./ui";

const GAME_MS = 60_000;
const MODES: { mode: RushMode; label: string }[] = [
  { mode: "hira", label: "ひらがな" },
  { mode: "kata", label: "カタカナ" },
  { mode: "mix", label: "섞기" },
];

type Phase = "ready" | "play" | "over";

/** 떨어지는 글자의 소리를 바닥에 닿기 전에 고른다. 60초 동안 점수 내기. */
export function RushGame() {
  const cards = useKanaStore((st) => st.cards);
  const learned = Object.keys(cards) as CardId[];
  const bests = useKanaStore((st) => st.bests);
  const recordBest = useKanaStore((st) => st.recordBest);
  const answer = useKanaStore((st) => st.answer);

  const [mode, setMode] = useState<RushMode>("hira");
  const [phase, setPhase] = useState<Phase>("ready");
  const [q, setQ] = useState<Question | null>(null);
  const [turn, setTurn] = useState(0);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [bestCombo, setBestCombo] = useState(0);
  const [left, setLeft] = useState(GAME_MS);
  const [flash, setFlash] = useState<{
    kind: "hit" | "miss";
    text: string;
    key: number;
  } | null>(null);
  const [missed, setMissed] = useState<CardId[]>([]);
  const [isNewBest, setIsNewBest] = useState(false);
  const endAt = useRef(0);
  const pool = useRef<CardId[]>([]);
  const locked = useRef(false);
  const gameId = `rush-${mode}`;
  const known = new Set(learned);

  const nextQuestion = (prev?: CardId) => {
    const p = pool.current;
    let pick = p[Math.floor(Math.random() * p.length)];
    if (pick === prev && p.length > 1)
      pick = p[(p.indexOf(pick) + 1) % p.length];
    setQ(makeQuestion(pick, p, "char-to-sound", Math.random));
    setTurn((t) => t + 1);
    locked.current = false;
  };

  const start = () => {
    pool.current = gamePool(learned, mode);
    setScore(0);
    setCombo(0);
    setBestCombo(0);
    setMissed([]);
    setIsNewBest(false);
    endAt.current = Date.now() + GAME_MS;
    setLeft(GAME_MS);
    setPhase("play");
    nextQuestion();
  };

  // 남은 시간
  // biome-ignore lint/correctness/useExhaustiveDependencies: 게임이 시작될 때만 시계를 건다
  useEffect(() => {
    if (phase !== "play") return;
    const t = setInterval(() => {
      const l = endAt.current - Date.now();
      if (l <= 0) {
        clearInterval(t);
        setLeft(0);
        setPhase("over");
        setIsNewBest(recordBest(gameId, scoreRef.current));
      } else setLeft(l);
    }, 100);
    return () => clearInterval(t);
  }, [phase]);

  const scoreRef = useRef(0);
  scoreRef.current = score;

  const miss = (id: CardId) => {
    setCombo(0);
    setMissed((m) => (m.includes(id) ? m : [...m, id]));
    if (known.has(id)) answer(id, false);
    setFlash({
      kind: "miss",
      text: getSound(parseCardId(id).soundId).ko,
      key: Date.now(),
    });
  };

  const choose = (c: CardId) => {
    if (!q || locked.current || phase !== "play") return;
    locked.current = true;
    if (c === q.answer) {
      const pts = rushPoints(combo);
      const nc = combo + 1;
      setScore((x) => x + pts);
      setCombo(nc);
      setBestCombo((b) => Math.max(b, nc));
      setFlash({ kind: "hit", text: `+${pts}`, key: Date.now() });
      if (known.has(q.answer)) answer(q.answer, true);
      void playSound(parseCardId(q.answer).soundId);
      setTimeout(() => nextQuestion(q.answer), 180);
    } else {
      miss(q.answer);
      setTimeout(() => nextQuestion(q.answer), 700);
    }
  };

  // PC: 1~4 키로 보기 고르기
  useChoiceKeys(
    q?.choices.length ?? 0,
    (i) => {
      const c = q?.choices[i];
      if (c) choose(c);
    },
    phase === "play",
  );

  if (phase === "ready") {
    return (
      <Screen title="빠르게 읽기">
        <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
          <Glyph
            className={cn(
              "text-8xl text-accent",
              s.glow,
              "rounded-full px-6 py-4",
            )}
          >
            速
          </Glyph>
          <h2 className="text-2xl font-bold">빠르게 읽기</h2>
          <p className="max-w-xs text-ink-soft">
            떨어지는 글자가 바닥에 닿기 전에 소리를 고르세요. 60초, 연속으로
            맞힐수록 점수가 커지고 글자도 빨라져요.
          </p>
          <div className="flex gap-2">
            {MODES.map((m) => (
              <button
                key={m.mode}
                type="button"
                lang={m.mode === "mix" ? undefined : "ja"}
                onClick={() => setMode(m.mode)}
                className={cn(
                  "rounded-full px-4 py-2",
                  mode === m.mode
                    ? "bg-accent text-white"
                    : "bg-bg-raised text-ink-soft",
                )}
              >
                {m.label}
              </button>
            ))}
          </div>
          <p className="text-sm text-ink-faint">
            최고 기록 {bests[gameId] ?? 0}점
          </p>
        </div>
        <div className="pb-[max(env(safe-area-inset-bottom),1.25rem)]">
          <PrimaryButton onClick={start}>시작</PrimaryButton>
        </div>
      </Screen>
    );
  }

  if (phase === "over") {
    return (
      <Screen title="빠르게 읽기">
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
          {isNewBest && (
            <p
              className={cn(
                "rounded-full bg-accent px-4 py-1 font-bold text-white",
                s.pop,
              )}
            >
              새 최고 기록!
            </p>
          )}
          <p className={cn("text-7xl font-bold", s.pop)}>{score}점</p>
          <p className="text-ink-soft">
            최고 {bestCombo} 연속 · 최고 기록 {bests[gameId] ?? score}점
          </p>
          {missed.length > 0 && (
            <div className="pt-4">
              <p className="text-sm text-ink-faint">놓친 글자</p>
              <p className="flex flex-wrap justify-center gap-3 pt-2">
                {missed.map((c) => (
                  <span key={c} className="flex flex-col items-center">
                    <Glyph className="text-4xl">{cardChar(c)}</Glyph>
                    <span className="text-xs text-ink-soft">
                      {getSound(parseCardId(c).soundId).ko}
                    </span>
                  </span>
                ))}
              </p>
            </div>
          )}
        </div>
        <div className="flex flex-col gap-3 pb-[max(env(safe-area-inset-bottom),1.25rem)]">
          <PrimaryButton onClick={start}>한 판 더</PrimaryButton>
          <Link href="/kana">
            <SecondaryButton tabIndex={-1}>가나 홈</SecondaryButton>
          </Link>
        </div>
      </Screen>
    );
  }

  const fallMs = rushFallMs(combo);
  return (
    <Screen progress={left / GAME_MS} back="/kana/game/rush">
      <div className="flex items-center justify-between pt-3 text-sm">
        <span className="font-mono text-2xl font-bold">{score}</span>
        {combo >= 2 && (
          <span key={combo} className={cn("font-bold text-accent", s.pop)}>
            {combo} 연속 {combo >= 5 && `· ×${rushPoints(combo)}`}
          </span>
        )}
        <span className="font-mono text-ink-soft">
          {Math.ceil(left / 1000)}초
        </span>
      </div>
      <div className="relative mt-3 flex-1 overflow-hidden rounded-3xl bg-bg-sunken">
        {q && (
          <div
            key={turn}
            className={cn(
              "absolute inset-x-0 top-0 flex h-full items-end justify-center pb-6",
              s.fall,
            )}
            style={{ animationDuration: `${fallMs}ms` }}
            onAnimationEnd={() => {
              if (locked.current) return;
              locked.current = true;
              miss(q.answer);
              setTimeout(() => nextQuestion(q.answer), 500);
            }}
          >
            <Glyph className="text-8xl">{cardChar(q.answer)}</Glyph>
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-1 bg-accent/60" />
        {flash && (
          <span
            key={flash.key}
            className={cn(
              "pointer-events-none absolute inset-x-0 top-1/3 text-center text-3xl font-bold",
              s.rise,
              flash.kind === "hit" ? "text-good" : "text-accent",
            )}
          >
            {flash.text}
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3 pt-4 pb-[max(env(safe-area-inset-bottom),1.25rem)] lg:grid-cols-4">
        {q?.choices.map((c, i) => {
          const sd = getSound(parseCardId(c).soundId);
          return (
            <button
              key={`${turn}-${c}`}
              type="button"
              onClick={() => choose(c)}
              className="relative flex h-20 flex-col items-center justify-center rounded-2xl bg-bg-raised active:scale-95 active:bg-accent-soft lg:h-24"
            >
              <ChoiceKey n={i + 1} />
              <span className="text-2xl font-bold">{sd.ko}</span>
              <span className="text-xs text-ink-soft">{sd.romaji}</span>
            </button>
          );
        })}
      </div>
    </Screen>
  );
}
