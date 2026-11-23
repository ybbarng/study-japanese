"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { KeyHelp, SidePanel } from "@/components/keyboard/key-help";
import { toKeyInput } from "@/components/keyboard/key-input";
import { type CardId, cardId, getSound, type Script } from "@/lib/kana/data";
import { pickPairs } from "@/lib/kana/games";
import { MATCH_KEYS, matchKeyAction } from "@/lib/kana/match-keys";
import { shuffle } from "@/lib/kana/quiz";
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

  // PC: 자판 왼손 세 줄(QWER·ASDF·ZXCV)이 판의 칸과 같은 자리
  const tapRef = useRef(tap);
  tapRef.current = tap;
  const tilesRef = useRef(tiles);
  tilesRef.current = tiles;
  useEffect(() => {
    if (done) return;
    const onKey = (e: KeyboardEvent) => {
      const a = matchKeyAction(
        { ...toKeyInput(e), code: e.code },
        tilesRef.current.length,
      );
      if (!a) return;
      e.preventDefault();
      if (a.kind === "cancel") setSelected(null);
      else tapRef.current(tilesRef.current[a.index]);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [done]);

  // 맞힌 짝을 맞힌 차례대로(곁칸에 소리와 함께 보인다)
  const pairs = [
    ...new Set(
      [...cleared].map((k) => tiles.find((t) => t.key === k)?.soundId ?? ""),
    ),
  ].filter(Boolean);

  const aside = (
    <>
      <SidePanel title="기록">
        <p className="font-mono text-4xl font-bold">{fmt(elapsed)}</p>
        <p className="mt-1 text-sm text-ink-soft">
          최고 {best !== undefined ? fmt(best) : "없음"} · 틀린 짝마다 2초 더함
        </p>
        <p className="mt-1 h-5 text-sm font-bold text-accent">
          {combo >= 2 && !done ? `${combo} 연속!` : ""}
        </p>
      </SidePanel>
      <SidePanel title={`맞힌 짝 ${pairs.length} / ${PAIRS}`}>
        {pairs.length === 0 ? (
          <p className="text-sm text-ink-faint">
            맞힌 짝이 여기 소리와 함께 쌓여요.
          </p>
        ) : (
          <ul className="grid grid-cols-2 gap-2">
            {pairs.map((id) => {
              const sd = getSound(id);
              return (
                <li
                  key={id}
                  className={cn(
                    "flex items-center justify-between rounded-xl bg-bg-raised px-3 py-2",
                    s.pop,
                  )}
                >
                  <Glyph className="text-2xl">
                    {sd.hira}
                    <span className="text-ink-faint">·</span>
                    {sd.kata}
                  </Glyph>
                  <span className="text-right text-xs leading-tight text-ink-soft">
                    {sd.ko}
                    <span className="block font-mono">{sd.romaji}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </SidePanel>
      <KeyHelp
        items={[
          { key: "Q~V", label: "칸 위 글자 키로 고르기" },
          { key: "Esc", label: "고른 칸 풀기" },
          { key: "Enter", label: "다 맞힌 뒤 한 판 더" },
        ]}
      />
    </>
  );

  return (
    <Screen title="짝 맞추기" aside={aside} asideLabel="기록과 맞힌 짝">
      <div className="flex items-center justify-between pt-3 text-sm lg:hidden">
        <span className="text-ink-soft">같은 소리끼리 짝지어요</span>
        <span className="font-mono text-lg">{fmt(elapsed)}</span>
      </div>
      <p className="hidden pt-3 text-sm text-ink-soft lg:block">
        같은 소리의 히라가나와 가타카나를 짝지어요. 마우스로 눌러도, 칸 위 글자
        키를 눌러도 돼요.
      </p>
      <div className="flex h-8 items-center justify-center lg:hidden">
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
          <div className="flex w-full flex-col gap-3 pt-6 lg:max-w-sm">
            {/* 나타나면 초점을 받아 Enter로 한 판 더 */}
            <PrimaryButton autoFocus onClick={restart}>
              한 판 더
            </PrimaryButton>
            <Link href="/kana">
              <SecondaryButton tabIndex={-1}>가나 홈</SecondaryButton>
            </Link>
          </div>
        </div>
      ) : (
        <>
          {/* PC: 4칸×3줄(자판 세 줄과 같은 모양), 화면 높이에 맞춰 판 넓이를 정한다 */}
          <div className="grid flex-1 grid-cols-3 content-center gap-3 lg:mx-auto lg:mt-6 lg:w-full lg:max-w-[calc((100dvh-13rem)*4/3)] lg:flex-none lg:grid-cols-4 lg:gap-4">
            {tiles.map((t, i) => {
              const isCleared = cleared.has(t.key);
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => tap(t)}
                  disabled={isCleared}
                  aria-keyshortcuts={MATCH_KEYS[i]}
                  aria-pressed={selected === t.key}
                  className={cn(
                    "relative flex aspect-square items-center justify-center rounded-2xl border-2 border-transparent bg-bg-raised transition-all duration-300 lg:hover:border-line",
                    selected === t.key &&
                      "border-accent bg-accent-soft lg:hover:border-accent",
                    wrong.includes(t.key) && cn("border-accent", s.shake),
                    isCleared && cn("scale-90 opacity-0", s.pop),
                  )}
                >
                  <ChoiceKey label={MATCH_KEYS[i]} />
                  <Glyph className="text-5xl lg:text-6xl">{t.char}</Glyph>
                </button>
              );
            })}
          </div>
          <p className="pt-4 pb-[max(env(safe-area-inset-bottom),1.25rem)] text-center text-xs text-ink-faint lg:hidden">
            최고 기록 {best !== undefined ? fmt(best) : "없음"}
          </p>
        </>
      )}
    </Screen>
  );
}
