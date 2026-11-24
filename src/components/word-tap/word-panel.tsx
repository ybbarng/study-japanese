"use client";

import Link from "next/link";
import { type KeyboardEvent, useEffect, useRef } from "react";
import { wordHref } from "@/components/dictionary/word-href";
import { Ruby } from "@/components/songs/line-words";
import { dictKey } from "@/lib/dictionary/entries";
import { lessonLabel } from "@/lib/ilmuta/labels";
import type { GrammarNote } from "@/lib/songs/analysis";
import { type LearnedIndex, learnedLessonOf } from "@/lib/songs/learned";
import { naverDictUrl, posLabel, wordRuby } from "@/lib/songs/words";
import type { HelpMode } from "@/lib/word-tap/help-mode";
import { particleNote } from "@/lib/word-tap/kana-info";
import { kanaForm, neighborToken, type TapToken } from "@/lib/word-tap/tokens";
import { CharBreakdown } from "./char-breakdown";

interface Props {
  tokens: TapToken[];
  index: number;
  /** 이 문장의 문법 메모 */
  grammar: readonly GrammarNote[];
  learned: LearnedIndex;
  lessonNo: number;
  mode: HelpMode;
  onMove: (index: number) => void;
  onClose: () => void;
}

/**
 * 누른 낱말(또는 글자)의 정보 창. 폰은 아래에서 올라오는 시트, PC는 오른쪽에 뜨는 창.
 * 키보드: Esc 닫기, ←·→ 앞뒤 낱말. 열리면 창에 초점이 온다.
 */
export function WordPanel({
  tokens,
  index,
  grammar,
  learned,
  lessonNo,
  mode,
  onMove,
  onClose,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const token = tokens[index];
  const prev = neighborToken(tokens, index, -1);
  const next = neighborToken(tokens, index, 1);

  useEffect(() => {
    ref.current?.focus({ preventScroll: true });
  }, []);

  // 초점이 창 밖에 있어도 Esc로 닫는다(재생기 단축키보다 먼저)
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented) return;
      e.preventDefault();
      onClose();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onClose]);

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    const to =
      e.key === "ArrowLeft" ? prev : e.key === "ArrowRight" ? next : null;
    if (to === null) return;
    // 재생기의 5초 옮기기보다 먼저 받는다
    e.preventDefault();
    onMove(to);
  };

  if (!token) return null;
  return (
    <div
      ref={ref}
      role="dialog"
      aria-label={token.charOnly ? "글자 설명" : "낱말 설명"}
      tabIndex={-1}
      onKeyDown={onKeyDown}
      data-word-panel
      className="fixed inset-x-0 bottom-0 z-50 max-h-[72dvh] overflow-y-auto rounded-t-3xl border border-line bg-bg-raised px-5 pt-4 pb-[max(env(safe-area-inset-bottom),1.25rem)] shadow-2xl outline-none lg:inset-x-auto lg:top-20 lg:right-6 lg:bottom-auto lg:max-h-[calc(100dvh-7rem)] lg:w-[26rem] lg:rounded-3xl lg:pb-5"
    >
      <div
        aria-hidden
        className="mx-auto mb-3 h-1 w-10 rounded-full bg-line lg:hidden"
      />
      <div className="flex items-center justify-between gap-2 text-sm">
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => prev !== null && onMove(prev)}
            disabled={prev === null}
            aria-label="앞 낱말"
            className="rounded-lg border border-line px-2.5 py-1 disabled:opacity-30"
          >
            ←
          </button>
          <button
            type="button"
            onClick={() => next !== null && onMove(next)}
            disabled={next === null}
            aria-label="뒤 낱말"
            className="rounded-lg border border-line px-2.5 py-1 disabled:opacity-30"
          >
            →
          </button>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg px-2 py-1 text-ink-faint hover:bg-bg-sunken"
        >
          닫기 <span className="hidden text-xs lg:inline">Esc</span>
        </button>
      </div>

      {token.charOnly ? (
        <CharOnly token={token} />
      ) : (
        <WordBody
          token={token}
          grammar={grammar}
          learned={learned}
          lessonNo={lessonNo}
          mode={mode}
        />
      )}
    </div>
  );
}

function CharOnly({ token }: { token: TapToken }) {
  return (
    <div className="mt-3">
      <CharBreakdown text={token.surface} initial={0} />
    </div>
  );
}

function WordBody({
  token,
  grammar,
  learned,
  lessonNo,
  mode,
}: {
  token: TapToken;
  grammar: readonly GrammarNote[];
  learned: LearnedIndex;
  lessonNo: number;
  mode: HelpMode;
}) {
  const base = token.base ?? token.surface;
  const learnedNo = learnedLessonOf({ base, surface: token.surface }, learned);
  const reading = kanaForm(token);
  const particle = particleNote(token.surface, token.pos);
  const breakdown = <CharBreakdown text={reading} />;
  return (
    <section aria-label="낱말" className="mt-3 flex flex-col gap-3">
      <p lang="ja" className="font-ja-serif text-4xl leading-[1.8] text-accent">
        <Ruby segments={wordRuby(token)} showReading />
      </p>
      {token.gloss ? (
        <p className="text-lg font-medium">{token.gloss}</p>
      ) : null}
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
        {reading !== token.surface ? (
          <>
            <dt className="text-ink-faint">읽는 법</dt>
            <dd lang="ja">{reading}</dd>
          </>
        ) : null}
        {base !== token.surface ? (
          <>
            <dt className="text-ink-faint">기본형</dt>
            <dd lang="ja">{base}</dd>
          </>
        ) : null}
        {token.pos ? (
          <>
            <dt className="text-ink-faint">품사</dt>
            <dd>{posLabel(token.pos)}</dd>
          </>
        ) : null}
      </dl>
      {particle ? (
        <p className="rounded-xl bg-warn/15 p-2 text-sm">{particle}</p>
      ) : null}
      {learnedNo !== null ? (
        learnedNo === lessonNo ? (
          <p className="w-fit rounded-full bg-good/15 px-3 py-1 text-sm text-good">
            이 강에서 배우는 낱말
          </p>
        ) : (
          <Link
            href={`/ilmuta/${learnedNo}`}
            className="w-fit rounded-full bg-good/15 px-3 py-1 text-sm text-good"
          >
            일무따 {lessonLabel(learnedNo)}에서 배움 →
          </Link>
        )
      ) : null}

      {mode === "open" ? (
        <div className="flex flex-col gap-2">
          <h3 className="text-sm text-ink-faint">글자 하나씩</h3>
          {breakdown}
        </div>
      ) : (
        <details className="group text-sm">
          <summary className="w-fit cursor-pointer rounded-lg px-1 py-0.5 text-ink-faint hover:bg-bg-sunken">
            글자 하나씩 보기
          </summary>
          <div className="mt-2">{breakdown}</div>
        </details>
      )}

      {grammar.length > 0 ? (
        <div className="flex flex-col gap-2 border-t border-line pt-3 text-sm">
          <h3 className="text-ink-faint">이 문장의 문법</h3>
          {grammar.map((note, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: 메모 차례가 곧 열쇠다
            <div key={i}>
              <p>
                <span lang="ja" className="font-ja-serif font-bold text-accent">
                  {note.pattern}
                </span>
                {note.ref && note.ref.lesson !== lessonNo ? (
                  <Link
                    href={`/${note.ref.book}/${note.ref.lesson}`}
                    className="ml-2 text-xs text-ink-soft underline underline-offset-4"
                  >
                    {note.ref.book === "ilmuta"
                      ? `일무따 ${lessonLabel(note.ref.lesson)}`
                      : `일문따 ${note.ref.lesson}과`}
                    에서 배움 →
                  </Link>
                ) : null}
              </p>
              <p className="leading-relaxed text-ink-soft">{note.explain}</p>
            </div>
          ))}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Link
          href={wordHref(dictKey(base))}
          className="w-fit rounded-xl border border-accent px-4 py-2 text-sm text-accent hover:bg-accent-soft"
        >
          사전에서 보기 →
        </Link>
        <a
          href={naverDictUrl(base)}
          target="_blank"
          rel="noopener noreferrer"
          className="w-fit rounded-xl border border-line px-4 py-2 text-sm hover:bg-bg-sunken"
        >
          네이버 사전에서 뜻 보기 ↗
        </a>
      </div>
    </section>
  );
}
