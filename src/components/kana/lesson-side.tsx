"use client";

import { SidePanel } from "@/components/keyboard/key-help";
import {
  type CardId,
  cardChar,
  getSound,
  hasAudio,
  parseCardId,
} from "@/lib/kana/data";
import { hintFor } from "@/lib/kana/hints";
import type { ChartView } from "@/lib/kana/lesson-side";
import { playSound } from "./audio";
import s from "./kana.module.css";
import { cn, Glyph } from "./ui";

// PC 가나 레슨·복습 화면의 오른쪽 곁칸 판들. 폰에서는 Screen이 곁칸을 그리지 않는다.

/**
 * 가나 전체 진도: 지금 레슨 위치와 끝낸 레슨 수. 단계(소개·알아보기…)는 본문 아래 단계 표가
 * 이미 보이므로 여기서는 되풀이하지 않는다(곁칸이 화면 높이 안에 들게).
 */
export function LessonProgressPanel({
  position,
  total,
  done,
  title,
}: {
  /** 지금 레슨 차례(1부터) */
  position: number;
  total: number;
  done: number;
  title: string;
}) {
  return (
    <section className="rounded-2xl border border-line px-5 py-4">
      <p className="flex items-baseline justify-between gap-3 text-sm">
        <span className="truncate font-medium">{title}</span>
        <span className="shrink-0 text-ink-faint">
          레슨 {position} / {total}
        </span>
      </p>
      <div
        role="progressbar"
        aria-label="끝낸 레슨"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={done}
        className="mt-3 h-1.5 overflow-hidden rounded-full bg-bg-raised"
      >
        <div
          className="h-full rounded-full bg-good"
          style={{ width: `${Math.round((done / total) * 100)}%` }}
        />
      </div>
      <p className="mt-2 text-xs text-ink-faint">끝낸 레슨 {done}개</p>
    </section>
  );
}

/**
 * 이 레슨 글자표. 지금 글자를 강조하고, 보이는 방식(view)에 따라 읽는 법·모양을 가린다.
 * 소리가 켜져 있으면 칸을 눌러 들을 수 있다.
 */
export function CharChart({
  title,
  cards,
  current,
  view,
  written,
}: {
  title: string;
  cards: readonly CardId[];
  current: CardId | null;
  view: ChartView;
  /** 쓰기에서 이미 쓴 글자(view.glyphs가 "written"일 때 이것만 모양을 보인다) */
  written?: ReadonlySet<CardId>;
}) {
  const long = cards.some((c) => cardChar(c).length > 1);
  return (
    <SidePanel title={title}>
      <ul className={cn("grid gap-1.5", long ? "grid-cols-3" : "grid-cols-5")}>
        {cards.map((c) => {
          const { soundId } = parseCardId(c);
          const sd = getSound(soundId);
          const showGlyph = view.glyphs === "all" || written?.has(c);
          const canSound = view.sound && hasAudio(soundId);
          const cell = (
            <>
              <Glyph className="text-2xl">
                {showGlyph ? cardChar(c) : "？"}
              </Glyph>
              <span className="text-[0.7rem] leading-none text-ink-soft">
                {view.readings ? sd.ko : " "}
              </span>
            </>
          );
          const cls = cn(
            "flex h-14 w-full flex-col items-center justify-center gap-1 rounded-xl bg-bg-raised",
            c === current && "ring-2 ring-accent",
            !showGlyph && "text-ink-faint",
          );
          return (
            <li key={c} aria-current={c === current ? "true" : undefined}>
              {canSound ? (
                <button
                  type="button"
                  aria-label={`${cardChar(c)} ${sd.ko} 소리 듣기`}
                  onClick={() => void playSound(soundId)}
                  className={cn(cls, "transition hover:bg-bg-sunken")}
                >
                  {cell}
                </button>
              ) : (
                <div className={cls}>{cell}</div>
              )}
            </li>
          );
        })}
      </ul>
      {!view.readings && (
        <p className="mt-3 text-xs text-ink-faint">
          문제를 다 풀면 읽는 법이 다시 보여요.
        </p>
      )}
      {view.glyphs === "written" && (
        <p className="mt-3 text-xs text-ink-faint">
          쓴 글자만 모양이 보여요. 소리는 눌러 들을 수 있어요.
        </p>
      )}
    </SidePanel>
  );
}

/** 헷갈리는 짝을 나란히 크게 보여 준다. 지금 글자가 낀 짝을 먼저 */
export function ComparePanel({
  pairs,
  current,
}: {
  pairs: readonly [CardId, CardId][];
  current: CardId | null;
}) {
  if (pairs.length === 0) return null;
  const sorted = [...pairs].sort(
    (p, q) =>
      Number(q.includes(current as CardId)) -
      Number(p.includes(current as CardId)),
  );
  return (
    <SidePanel title="비슷한 글자 비교">
      <ul className="flex flex-col gap-2">
        {sorted.slice(0, 4).map(([a, b]) => (
          <li
            key={`${a}-${b}`}
            className={cn(
              "grid grid-cols-2 gap-2 rounded-xl bg-bg-raised p-2",
              (a === current || b === current) && "ring-1 ring-accent/60",
            )}
          >
            {[a, b].map((c) => (
              <div key={c} className="flex flex-col items-center gap-1">
                <Glyph className="text-4xl">{cardChar(c)}</Glyph>
                <span className="text-xs text-ink-soft">
                  {getSound(parseCardId(c).soundId).ko}
                </span>
              </div>
            ))}
          </li>
        ))}
      </ul>
      {current && sorted[0]?.includes(current) && (
        <p className="mt-3 text-xs leading-relaxed text-ink-soft">
          {hintFor(current)}
        </p>
      )}
    </SidePanel>
  );
}

export type Answered = { id: CardId; ok: boolean };

/** 이번에 푼 문제를 푼 차례대로(답한 뒤라 읽는 법을 보여도 된다) */
export function AnsweredPanel({
  answered,
  total,
}: {
  answered: readonly Answered[];
  total: number;
}) {
  const right = answered.filter((a) => a.ok).length;
  return (
    <SidePanel title={`푼 문제 ${answered.length} / ${total}`}>
      {answered.length === 0 ? (
        <p className="text-sm text-ink-faint">
          답한 글자가 여기 맞힘·틀림과 함께 쌓여요.
        </p>
      ) : (
        <>
          <p className="mb-3 text-sm text-ink-soft">
            맞힘 <span className="font-bold text-good">{right}</span> · 틀림{" "}
            <span className="font-bold text-accent">
              {answered.length - right}
            </span>
          </p>
          <ul className="grid max-h-[40dvh] grid-cols-4 gap-1.5 overflow-y-auto">
            {answered.map((a, k) => (
              <li
                // 같은 글자를 다시 풀 수 있어 차례를 열쇠에 넣는다
                // biome-ignore lint/suspicious/noArrayIndexKey: 푼 차례가 곧 정체다
                key={k}
                className={cn(
                  "flex flex-col items-center rounded-xl py-1.5",
                  a.ok ? "bg-good/10" : "bg-accent-soft",
                  k === answered.length - 1 && s.pop,
                )}
              >
                <Glyph className="text-xl">{cardChar(a.id)}</Glyph>
                <span className="text-[0.7rem] text-ink-soft">
                  {getSound(parseCardId(a.id).soundId).ko}
                  <span className="sr-only">{a.ok ? " 맞힘" : " 틀림"}</span>
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </SidePanel>
  );
}
