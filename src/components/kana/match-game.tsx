"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { type CardId, cardId, getSound, type Script } from "@/lib/kana/data";
import { pickPairs } from "@/lib/kana/games";
import { shuffle } from "@/lib/kana/quiz";
import { useKanaStore } from "@/lib/kana/store";
import { playSound } from "./audio";
import s from "./kana.module.css";
import { cn, Glyph, PrimaryButton, Screen, SecondaryButton } from "./ui";

const PAIRS = 6;
const GAME_ID = "match";

interface Tile {
  key: string;
  soundId: string;
  script: Script;
  char: string;
}

function makeTiles(learned: ReadonlySet<CardId>): Tile[] {
  const ids = pickPairs(learned, PAIRS, Math.random);
  const tiles = ids.flatMap((id) => {
    const sd = getSound(id);
    return [
      {
        key: `h-${id}`,
        soundId: id,
        script: "hira" as const,
        char: sd.hira ?? "",
      },
      {
        key: `k-${id}`,
        soundId: id,
        script: "kata" as const,
        char: sd.kata ?? "",
      },
    ];
  });
  return shuffle(tiles, Math.random);
}

/** 같은 소리의 히라가나와 가타카나를 짝지어 지운다. 빨리 다 지울수록 좋은 기록. */
export function MatchGame() {
  const cards = useKanaStore((st) => st.cards);
  const best = useKanaStore((st) => st.bests[GAME_ID]);
  const recordBest = useKanaStore((st) => st.recordBest);
  const answer = useKanaStore((st) => st.answer);

  const [tiles, setTiles] = useState<Tile[]>(() =>
    makeTiles(new Set(Object.keys(cards) as CardId[])),
  );
  const [selected, setSelected] = useState<string | null>(null);
  const [cleared, setCleared] = useState<Set<string>>(new Set());
  const [wrong, setWrong] = useState<string[]>([]);
  const [combo, setCombo] = useState(0);
  const [startAt, setStartAt] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [done, setDone] = useState<{ ms: number; isNew: boolean } | null>(null);
  const mistakes = useRef(0);

  useEffect(() => {
    if (startAt === null || done) return;
    const t = setInterval(() => setElapsed(Date.now() - startAt), 100);
    return () => clearInterval(t);
  }, [startAt, done]);

  const restart = () => {
    setTiles(makeTiles(new Set(Object.keys(cards) as CardId[])));
    setSelected(null);
    setCleared(new Set());
    setWrong([]);
    setCombo(0);
    setStartAt(null);
    setElapsed(0);
    setDone(null);
    mistakes.current = 0;
  };

  const tap = (t: Tile) => {
    if (cleared.has(t.key) || done) return;
    const now = Date.now();
    if (startAt === null) setStartAt(now);
    if (!selected) {
      setSelected(t.key);
      setWrong([]);
      return;
    }
    if (selected === t.key) {
      setSelected(null);
      return;
    }
    const a = tiles.find((x) => x.key === selected);
    setSelected(null);
    if (!a) return;
    if (a.soundId === t.soundId && a.script !== t.script) {
      const next = new Set(cleared).add(a.key).add(t.key);
      setCleared(next);
      setCombo((c) => c + 1);
      void playSound(t.soundId);
      for (const sc of ["hira", "kata"] as const) {
        const id = cardId(sc, t.soundId);
        if (cards[id]) answer(id, true);
      }
      if (next.size === tiles.length) {
        const ms = now - (startAt ?? now) + mistakes.current * 2000;
        setElapsed(ms);
        setDone({ ms, isNew: recordBest(GAME_ID, ms, false) });
      }
    } else {
      mistakes.current += 1;
      setCombo(0);
      setWrong([a.key, t.key]);
    }
  };

  const fmt = (ms: number) => `${(ms / 1000).toFixed(1)}초`;

  return (
    <Screen title="짝 맞추기">
      <div className="flex items-center justify-between pt-3 text-sm">
        <span className="text-ink-soft">같은 소리끼리 짝지어요</span>
        <span className="font-mono text-lg">{fmt(elapsed)}</span>
      </div>
      <div className="flex h-8 items-center justify-center">
        {combo >= 2 && !done && (
          <span
            key={combo}
            className={cn("text-sm font-bold text-accent", s.pop)}
          >
            {combo} 연속!
          </span>
        )}
      </div>
      {done ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
          {done.isNew && (
            <p
              className={cn(
                "rounded-full bg-accent px-4 py-1 font-bold text-white",
                s.pop,
              )}
            >
              새 최고 기록!
            </p>
          )}
          <p className={cn("text-6xl font-bold", s.pop)}>{fmt(done.ms)}</p>
          <p className="text-ink-soft">
            틀린 짝 {mistakes.current}번(번마다 2초 더함)
            {best !== undefined && ` · 최고 ${fmt(Math.min(best, done.ms))}`}
          </p>
          <div className="flex w-full flex-col gap-3 pt-6">
            <PrimaryButton onClick={restart}>한 판 더</PrimaryButton>
            <Link href="/kana">
              <SecondaryButton tabIndex={-1}>가나 홈</SecondaryButton>
            </Link>
          </div>
        </div>
      ) : (
        <>
          <div className="grid flex-1 grid-cols-3 content-center gap-3">
            {tiles.map((t) => {
              const isCleared = cleared.has(t.key);
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => tap(t)}
                  disabled={isCleared}
                  className={cn(
                    "flex aspect-square items-center justify-center rounded-2xl border-2 border-transparent bg-bg-raised transition-all duration-300",
                    selected === t.key && "border-accent bg-accent-soft",
                    wrong.includes(t.key) && cn("border-accent", s.shake),
                    isCleared && cn("scale-90 opacity-0", s.pop),
                  )}
                >
                  <Glyph className="text-5xl">{t.char}</Glyph>
                </button>
              );
            })}
          </div>
          <p className="pt-4 pb-[max(env(safe-area-inset-bottom),1.25rem)] text-center text-xs text-ink-faint">
            최고 기록 {best !== undefined ? fmt(best) : "없음"}
          </p>
        </>
      )}
    </Screen>
  );
}
