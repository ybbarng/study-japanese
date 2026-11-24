"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { wordHref } from "@/components/dictionary/word-href";
import { toKeyInput } from "@/components/keyboard/key-input";
import { WordPicture } from "@/components/pictures/word-picture";
import { Ruby } from "@/components/songs/line-words";
import { dictKey } from "@/lib/dictionary/entries";
import { lessonLabel } from "@/lib/ilmuta/labels";
import type { GrammarNote } from "@/lib/songs/analysis";
import { type LearnedIndex, learnedLessonOf } from "@/lib/songs/learned";
import { naverDictUrl, posLabel, wordRuby } from "@/lib/songs/words";
import type { HelpMode } from "@/lib/word-tap/help-mode";
import { particleNote } from "@/lib/word-tap/kana-info";
import { panelKeyFor } from "@/lib/word-tap/panel-keys";
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

/** 폰(또는 자리가 없는 화면): 아래에서 올라오는 시트, PC는 오른쪽 위에 뜨는 창 */
const FLOATING =
  "fixed inset-x-0 bottom-0 z-50 max-h-[72dvh] overflow-y-auto rounded-t-3xl border border-line bg-bg-raised px-5 pt-4 pb-[max(env(safe-area-inset-bottom),1.25rem)] shadow-2xl outline-none lg:inset-x-auto lg:top-20 lg:right-6 lg:bottom-auto lg:max-h-[calc(100dvh-7rem)] lg:w-[26rem] lg:rounded-3xl lg:pb-5";

/** PC 강 화면: 오른쪽 칸의 재생기 아래(지금 하는 말·자막 자리)를 잠시 덮는다 */
const IN_SLOT =
  "absolute inset-x-0 top-0 z-20 min-h-full overflow-y-auto rounded-3xl border border-line bg-bg-raised px-5 pt-4 pb-5 shadow-xl outline-none";

/** lg(64rem) 이상이고 강 화면 오른쪽 칸에 창 자리가 보이면 그 자리 */
function findSlot(): HTMLElement | null {
  if (typeof window === "undefined") return null;
  if (!window.matchMedia("(min-width: 64rem)").matches) return null;
  const el = document.querySelector<HTMLElement>("[data-word-panel-slot]");
  return el && el.getClientRects().length > 0 ? el : null;
}

/**
 * 창을 둘 곳. 창은 누른 뒤에야 그려지므로(서버에서 그리지 않는다) 처음 값을 바로 잰다.
 * 창 넓이가 lg 경계를 넘나들면 다시 정한다.
 */
function usePanelSlot(): HTMLElement | null {
  const [slot, setSlot] = useState<HTMLElement | null>(findSlot);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 64rem)");
    const update = () => setSlot(findSlot());
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return slot;
}

/** 자리 안에 띄운 창이 화면 아래로 넘치지 않게: 자리 위쪽부터 화면 끝까지 */
function useSlotMaxHeight(slot: HTMLElement | null): number | null {
  const [h, setH] = useState<number | null>(null);
  useEffect(() => {
    if (!slot) return;
    const measure = () =>
      setH(
        Math.max(
          240,
          window.innerHeight - slot.getBoundingClientRect().top - 16,
        ),
      );
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, { passive: true });
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure);
    };
  }, [slot]);
  return h;
}

/**
 * 누른 낱말(또는 글자)의 정보 창. 폰은 아래에서 올라오는 시트, PC 강 화면은 오른쪽 칸의 재생기 아래를
 * 덮는 창(재생 조작과 가운데 교재는 가리지 않는다).
 * 키보드: 창이 열려 있는 동안 Esc 닫기, ←·→ 앞뒤 낱말(닫히면 ←·→는 다시 재생기 5초 옮기기). 열리면 창에 초점이 온다.
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

  const slot = usePanelSlot();
  const maxHeight = useSlotMaxHeight(slot);

  // biome-ignore lint/correctness/useExhaustiveDependencies: 창이 자리를 옮기면(새 요소) 다시 초점을 준다
  useEffect(() => {
    ref.current?.focus({ preventScroll: true });
  }, [slot]);

  // 초점이 창 밖(본문·재생기 단추)에 있어도 창이 열려 있으면 Esc·←·→는 창의 일이다.
  // 붙잡기 단계에서 먼저 받아 재생기의 5초 옮기기로 넘어가지 않게 한다
  const latest = useRef({ prev, next, onMove, onClose });
  latest.current = { prev, next, onMove, onClose };
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.defaultPrevented) return;
      const action = panelKeyFor(toKeyInput(e));
      if (!action) return;
      e.preventDefault();
      const h = latest.current;
      if (action === "close") h.onClose();
      else {
        const to = action === "prev" ? h.prev : h.next;
        if (to !== null) h.onMove(to);
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, []);

  if (!token) return null;
  const panel = (
    <div
      ref={ref}
      role="dialog"
      aria-label={token.charOnly ? "글자 설명" : "낱말 설명"}
      tabIndex={-1}
      data-word-panel
      data-word-panel-place={slot ? "aside" : "float"}
      style={slot && maxHeight ? { maxHeight } : undefined}
      className={slot ? IN_SLOT : FLOATING}
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
  return slot ? createPortal(panel, slot) : panel;
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
      <div className="flex items-center justify-between gap-3">
        <p
          lang="ja"
          className="font-ja-serif text-4xl leading-[1.8] text-accent"
        >
          <Ruby segments={wordRuby(token)} showReading />
        </p>
        {/* 그림이 있는 낱말은 뜻을 그림으로도 보인다(창은 누른 뒤에 열리니 뜻을 가릴 일이 없다) */}
        <WordPicture
          ja={base}
          size={64}
          className="rounded-2xl bg-bg-sunken p-1"
        />
      </div>
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
