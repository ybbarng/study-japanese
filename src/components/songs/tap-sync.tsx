"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { PageFrame } from "@/components/shell/page-frame";
import { cn } from "@/lib/cn";
import { LOOP_OFF } from "@/lib/songs/loop";
import type { Song } from "@/lib/songs/schema";
import {
  applyTaps,
  moveCursor,
  nudge,
  startTaps,
  type TapState,
  tap,
  undoTap,
} from "@/lib/songs/tap-sync";
import { formatLineTime, timingIssues } from "@/lib/songs/timing";
import { inputOf, saveSong } from "./save-song";
import { useSongPlayback } from "./use-song-playback";
import { useTapClock } from "./use-tap-clock";
import { useTapKeys } from "./use-tap-keys";

/** 줄을 눌러 그 줄부터 다시 맞출 때, 이만큼 앞에서부터 틀어 준비할 틈을 둔다 */
const LEAD_IN_SEC = 2;
const NUDGE_SEC = 0.1;

/**
 * 박자 맞추기(관리자). 노래를 틀어 두고 줄이 시작될 때마다 Space(PC)나 큰 단추(폰)를 누르면
 * 그 줄의 시작 시각이 적힌다. 줄마다 ±0.1초로 다듬고 저장한다.
 */
export function TapSync({ song: initial }: { song: Song }) {
  const [song, setSong] = useState(initial);
  const [state, setState] = useState<TapState>(() => startTaps(initial.lines));
  const [status, setStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const playback = useSongPlayback(song, LOOP_OFF);
  const positionNow = useTapClock(song.slug);

  const lines = useMemo(
    () => applyTaps(song.lines, state),
    [song.lines, state],
  );
  const issues = useMemo(() => new Set(timingIssues(lines)), [lines]);
  const done = state.cursor >= lines.length;

  const onTap = () => {
    const t = positionNow();
    if (t === null) {
      setStatus("먼저 노래를 트세요.");
      return;
    }
    setStatus(null);
    setState((s) => tap(s, t));
  };
  useTapKeys({ onTap, onUndo: () => setState(undoTap) });

  const restartFrom = (i: number) => {
    setState((s) => moveCursor(s, i));
    const before = [...state.times.slice(0, i + 1)]
      .reverse()
      .find((t) => t !== undefined);
    playback.playFrom(Math.max(0, (before ?? 0) - LEAD_IN_SEC));
  };

  const save = async () => {
    setSaving(true);
    const result = await saveSong(song.slug, { ...inputOf(song), lines });
    setSaving(false);
    if (!result.ok) return setStatus(result.error);
    setSong(result.song);
    setState((s) => ({ ...startTaps(result.song.lines), cursor: s.cursor }));
    setStatus("저장했습니다.");
  };

  const cursorLine = lines[state.cursor];
  const prevLine = state.cursor > 0 ? lines[state.cursor - 1] : null;

  return (
    <PageFrame className="pb-40 lg:pb-28">
      <header>
        <Link href={`/songs/${song.slug}`} className="text-sm text-ink-faint">
          ← 가사로
        </Link>
        <h1 className="mt-3 text-2xl font-bold">
          박자 맞추기 · <span lang="ja">{song.title}</span>
        </h1>
        <p className="mt-1 text-sm text-ink-soft">
          노래를 틀고, 줄을 부르기 시작할 때마다{" "}
          <kbd className="rounded border border-line px-1.5 font-mono">
            Space
          </kbd>{" "}
          (폰은 큰 단추)를 누르세요.{" "}
          <kbd className="rounded border border-line px-1.5 font-mono">
            Backspace
          </kbd>
          는 한 줄 되돌리기. 줄을 누르면 그 줄부터 다시 맞춥니다.
        </p>
      </header>

      <div className="mt-6 flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(0,1fr)_26rem] lg:items-start lg:gap-10">
        <ol
          aria-label="줄마다 시작 시각"
          className="order-2 flex flex-col gap-1 lg:order-1"
        >
          {lines.map((line, i) => (
            <li
              // biome-ignore lint/suspicious/noArrayIndexKey: 같은 글의 줄(후렴)이 여러 번 나와 차례를 열쇠로 쓴다
              key={i}
              aria-current={i === state.cursor ? "true" : undefined}
              className={cn(
                "flex items-center gap-2 rounded-xl px-2 py-1.5",
                i === state.cursor && "bg-accent-soft",
              )}
            >
              <span
                className={cn(
                  "w-16 shrink-0 font-mono text-sm",
                  issues.has(i) ? "text-warn" : "text-ink-soft",
                )}
                title={issues.has(i) ? "앞 줄보다 빨리 시작합니다" : undefined}
              >
                {formatLineTime(line.start)}
              </span>
              <button
                type="button"
                onClick={() => restartFrom(i)}
                lang="ja"
                className="min-w-0 flex-1 truncate rounded-lg px-2 py-1 text-left font-ja-serif text-lg hover:bg-bg-raised"
                title="이 줄부터 다시 맞추기"
              >
                {line.ja}
              </button>
              <NudgeButton
                label={`${i + 1}번째 줄 0.1초 앞으로`}
                disabled={line.start === undefined}
                onClick={() => setState((s) => nudge(s, i, -NUDGE_SEC))}
              >
                −
              </NudgeButton>
              <NudgeButton
                label={`${i + 1}번째 줄 0.1초 뒤로`}
                disabled={line.start === undefined}
                onClick={() => setState((s) => nudge(s, i, NUDGE_SEC))}
              >
                +
              </NudgeButton>
            </li>
          ))}
        </ol>

        <section
          aria-label="누르기"
          className="sticky top-2 z-10 order-1 flex flex-col gap-4 rounded-2xl border border-line bg-bg-sunken p-5 shadow-xl lg:top-6 lg:order-2 lg:shadow-none"
        >
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={playback.toggle}
              className="rounded-xl border border-line px-4 py-2 text-sm hover:bg-bg-raised"
            >
              {playback.playing ? "멈추기" : "노래 틀기"}
            </button>
            <button
              type="button"
              onClick={() => restartFrom(0)}
              className="rounded-xl px-3 py-2 text-sm text-ink-soft hover:bg-bg-raised"
            >
              처음부터
            </button>
            <span className="ml-auto self-center font-mono text-sm text-ink-faint">
              {formatLineTime(playback.pos ?? undefined)}
            </span>
          </div>
          {prevLine ? (
            <p lang="ja" className="truncate text-sm text-ink-faint">
              {formatLineTime(prevLine.start)} {prevLine.ja}
            </p>
          ) : null}
          <p
            lang="ja"
            className="min-h-[4.5rem] font-ja-serif text-2xl leading-relaxed text-accent lg:text-3xl"
          >
            {cursorLine ? cursorLine.ja : "마지막 줄까지 맞췄습니다."}
          </p>
          <button
            type="button"
            onClick={onTap}
            disabled={done}
            className="rounded-2xl bg-accent py-6 text-lg font-bold text-white active:scale-[0.98] disabled:opacity-40"
          >
            지금 줄 시작
          </button>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setState(undoTap)}
              className="rounded-xl border border-line px-4 py-2 text-sm hover:bg-bg-raised"
            >
              한 줄 되돌리기
            </button>
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="ml-auto rounded-xl bg-good/20 px-5 py-2 text-sm font-medium text-good disabled:opacity-60"
            >
              {saving ? "저장 중…" : "저장"}
            </button>
          </div>
          {status ? (
            <p role="status" className="text-sm text-ink-soft">
              {status}
            </p>
          ) : null}
        </section>
      </div>
    </PageFrame>
  );
}

function NudgeButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-line text-ink-soft hover:bg-bg-raised disabled:opacity-30"
    >
      {children}
    </button>
  );
}
