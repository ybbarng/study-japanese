"use client";

import { useEffect, useRef, useState } from "react";
import { InlineKey } from "@/components/keyboard/key-help";
import { toKeyInput } from "@/components/keyboard/key-input";
import {
  type CardId,
  cardChar,
  confusablesOf,
  getSound,
  hasAudio,
  parseCardId,
} from "@/lib/kana/data";
import { hintFor } from "@/lib/kana/hints";
import { introKeyAction } from "@/lib/kana/lesson-side";
import type { Lesson } from "@/lib/kana/lessons";
import { kanaToRomaji } from "@/lib/kana/text";
import { playSound, playWord } from "./audio";
import s from "./kana.module.css";
import { cn, Glyph, PrimaryButton, SecondaryButton, SoundButton } from "./ui";

type Page =
  | { kind: "note"; title: string; body: string; example?: string }
  | { kind: "card"; id: CardId };

/** 새 글자를 한 장씩 크게 보여 준다. 설명(note)이 있으면 먼저. */
export function IntroStep({
  lesson,
  cards,
  onDone,
  onProgress,
  onCard,
}: {
  lesson: Lesson;
  cards: CardId[];
  onDone: () => void;
  onProgress: (f: number) => void;
  /** 지금 보이는 글자(설명 장이면 null). PC 곁칸이 그 글자를 강조한다 */
  onCard?: (id: CardId | null) => void;
}) {
  const pages: Page[] = [
    ...(lesson.notes ?? []).map((n) => ({ kind: "note" as const, ...n })),
    ...cards.map((id) => ({ kind: "card" as const, id })),
  ];
  const [i, setI] = useState(0);
  const page = pages[i];
  const pageCard = page.kind === "card" ? page.id : null;

  useEffect(() => onProgress(i / pages.length), [i, pages.length, onProgress]);
  useEffect(() => onCard?.(pageCard), [pageCard, onCard]);

  const go = (d: number) => {
    const n = i + d;
    if (n >= pages.length) onDone();
    else if (n >= 0) setI(n);
  };

  // PC 키보드: Enter 다음, Backspace 앞, 1 소리 다시 듣기
  const onKeyRef = useRef<(e: KeyboardEvent) => void>(() => {});
  onKeyRef.current = (e) => {
    const a = introKeyAction(toKeyInput(e));
    if (!a) return;
    e.preventDefault();
    if (a === "next") go(1);
    else if (a === "prev") go(-1);
    else if (pageCard) void playSound(parseCardId(pageCard).soundId);
    else if (page.kind === "note" && page.example) void playWord(page.example);
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => onKeyRef.current(e);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="flex flex-1 flex-col">
      <div
        key={i}
        className={cn(
          "flex flex-1 flex-col items-center justify-center text-center",
          s.enter,
        )}
      >
        {page.kind === "note" ? (
          <NotePage {...page} />
        ) : (
          <CardPage id={page.id} />
        )}
      </div>
      <div className="flex gap-3 pt-4">
        {i > 0 && (
          <SecondaryButton
            className="w-24 shrink-0 lg:w-40"
            onClick={() => go(-1)}
          >
            이전
            <InlineKey k="⌫" />
          </SecondaryButton>
        )}
        <PrimaryButton onClick={() => go(1)}>
          {i + 1 >= pages.length ? "연습하러 가기" : "다음"}
          <InlineKey k="Enter" onAccent />
        </PrimaryButton>
      </div>
      <p className="pt-2 text-center text-xs text-ink-faint">
        {i + 1} / {pages.length}
      </p>
    </div>
  );
}

function NotePage({
  title,
  body,
  example,
}: {
  title: string;
  body: string;
  example?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-5">
      <p className="text-sm text-accent">알아 둘 것</p>
      <h2 className="text-2xl font-bold">{title}</h2>
      <p className="max-w-xs leading-relaxed text-ink-soft">{body}</p>
      {example && (
        <div className="mt-2 flex items-center gap-3 rounded-2xl bg-bg-raised px-5 py-3">
          <Glyph className="text-4xl">{example}</Glyph>
          <span className="text-ink-soft">{kanaToRomaji(example)}</span>
          <SoundButton word={example} />
        </div>
      )}
    </div>
  );
}

function CardPage({ id }: { id: CardId }) {
  const { soundId, script } = parseCardId(id);
  const sound = getSound(soundId);
  const twin = script === "hira" ? sound.kata : sound.hira;
  const confusing = confusablesOf(id);
  return (
    <div className="flex flex-col items-center gap-4">
      <Glyph
        className={cardChar(id).length > 1 ? "text-[7rem]" : "text-[11rem]"}
      >
        {cardChar(id)}
      </Glyph>
      <div className="flex items-center gap-4">
        <div className="text-left">
          <p className="text-3xl font-bold">{sound.ko}</p>
          <p className="text-ink-soft">{sound.romaji}</p>
        </div>
        {hasAudio(soundId) && <SoundButton soundId={soundId} autoPlay />}
      </div>
      <p className="max-w-xs text-ink-soft leading-relaxed">{hintFor(id)}</p>
      <div className="flex flex-wrap justify-center gap-2 text-sm">
        {twin && (
          <span className="rounded-full bg-bg-raised px-3 py-1 text-ink-faint">
            {script === "hira" ? "가타카나" : "히라가나"}{" "}
            <span lang="ja" className="text-ink-soft">
              {twin}
            </span>
          </span>
        )}
        {confusing.map((c) => (
          <span
            key={c}
            className="rounded-full bg-accent-soft px-3 py-1 text-accent"
          >
            헷갈림 주의{" "}
            <span lang="ja" className="font-bold">
              {cardChar(id)} ↔ {cardChar(c)}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}
