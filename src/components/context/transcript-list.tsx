"use client";

import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import {
  type ContextCue,
  type Transcript,
  transcriptCues,
} from "@/lib/context/cues";
import { usePlaybackClock, usePositionOf } from "@/lib/player/clock";
import { stageView } from "@/lib/player/follow";
import { usePlayer } from "@/lib/player/store";
import { CueExtras, CueHeadline } from "./cue-card";
import { LoopButton } from "./loop-button";
import { useCueActions } from "./use-cue-actions";

interface Props {
  transcript: Transcript;
  book: string;
  item: string;
  /** 이 강의가 재생기에 올라 있지 않을 때 줄을 누르면 먼저 틀 대기열 */
  onStart?: () => void;
  /**
   * 일본어 줄에 읽는 법·뜻·낱말을 펼쳐 보일지. 화면의 다른 칸이 지금 하는 말을 크게 보이고 있으면
   * 끄고(목록은 지금 줄만 강조), 이 목록이 유일한 자막 칸이면 켠다.
   */
  expand?: boolean;
  /** 머리 줄 왼쪽 글(무엇의 자막인지) */
  title?: ReactNode;
  className?: string;
}

/** 손으로 목록을 굴린 뒤 이만큼은 지금 줄을 따라 굴리지 않는다 */
const HOLD_MS = 4000;

/**
 * PC 곁칸의 강의 자막 전체. 지금 줄을 강조하고 목록이 그 줄을 따라 굴러간다.
 * 줄을 누르면 그 말부터 다시 듣는다(책에는 없는 것: 못 알아들은 곳으로 바로 돌아가기).
 * 펼치는 줄은 지금 줄이 아니라 방금 나온 일본어 줄이다. 그 줄은 다음 일본어 줄이 나올 때까지
 * 펼쳐 둔 채로 두어, 한국어 줄이 1~2초마다 바뀌어도 목록이 접혔다 펴지지 않는다.
 */
export function TranscriptList({
  transcript,
  book,
  item,
  onStart,
  expand = true,
  title = "자막 · 줄을 누르면 그 말부터",
  className,
}: Props) {
  const cues = useMemo(() => transcriptCues(transcript), [transcript]);
  const pos = usePositionOf(book, item);
  const seekTo = usePlayer((s) => s.seekTo);
  const actions = useCueActions(book, item, cues);
  const loopPause = usePlaybackClock((s) => s.loopPause);
  const view = pos === null ? null : stageView(cues, pos);
  const at = view?.at ?? -1;
  const open = expand && view ? (view.held >= 0 ? view.held : at) : -1;
  const listRef = useRef<HTMLOListElement>(null);
  const heldUntil = useRef(0);
  const [held, setHeld] = useState(false);
  // 다른 트랙이 올라 있을 때 누른 줄: 이 강의가 틀어지면 그 자리로 옮긴다
  const pending = useRef<number | null>(null);

  useEffect(() => {
    if (pos === null || pending.current === null) return;
    const sec = pending.current;
    pending.current = null;
    seekTo(sec);
  }, [pos, seekTo]);

  useEffect(() => {
    const list = listRef.current;
    if (!list || at < 0 || Date.now() < heldUntil.current) return;
    const el = list.querySelector<HTMLElement>(`[data-cue="${at}"]`);
    if (!el) return;
    list.scrollTo({
      top: el.offsetTop - list.clientHeight / 2 + el.clientHeight / 2,
      behavior: "smooth",
    });
  }, [at]);

  const hold = () => {
    heldUntil.current = Date.now() + HOLD_MS;
    setHeld(true);
    window.setTimeout(() => {
      if (Date.now() >= heldUntil.current) setHeld(false);
    }, HOLD_MS + 50);
  };

  const play = (cue: ContextCue) => {
    heldUntil.current = 0;
    setHeld(false);
    if (pos !== null) actions.seek(cue);
    else {
      pending.current = cue.start;
      onStart?.();
    }
  };

  return (
    <section
      aria-label="강의 자막"
      className={cn(
        "flex min-h-0 flex-col rounded-2xl bg-bg-sunken",
        className,
      )}
    >
      <header className="flex items-center justify-between gap-2 px-4 pt-3 pb-2 text-xs text-ink-faint">
        <span className="min-w-0 truncate">{title}</span>
        {held && at >= 0 ? (
          <span className="shrink-0">목록을 보는 중</span>
        ) : null}
      </header>
      <ol
        ref={listRef}
        onWheel={hold}
        onTouchMove={hold}
        className="relative min-h-0 flex-1 overflow-y-auto px-2 pb-4"
      >
        {cues.map((cue, i) => {
          const current = i === at;
          const opened = i === open;
          return (
            <li
              // biome-ignore lint/suspicious/noArrayIndexKey: 같은 시각에 시작하는 줄이 있을 수 있어 차례를 함께 쓴다
              key={`${cue.start}-${i}`}
              data-cue={i}
              className={cn(
                "rounded-xl",
                current && "bg-accent-soft",
                opened && !current && "bg-bg-raised",
              )}
            >
              <button
                type="button"
                onClick={() => play(cue)}
                aria-current={current ? "true" : undefined}
                className={cn(
                  "block w-full rounded-xl px-3 py-2 text-left transition-colors",
                  !current && "hover:bg-bg-raised",
                  current || opened
                    ? "text-ink"
                    : i < at
                      ? "text-ink-faint"
                      : "text-ink-soft",
                )}
              >
                <CueHeadline cue={cue} size="list" detail={opened} />
              </button>
              {opened ? (
                <div className="px-3 pb-3">
                  <CueExtras cue={cue} />
                  <div className="mt-3 flex items-center gap-3">
                    <LoopButton
                      active={actions.isLooping(cue)}
                      onClick={() => actions.toggle(cue)}
                    />
                    {loopPause && actions.looping ? (
                      <span className="animate-pulse text-sm text-accent">
                        따라 말해 보세요
                      </span>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
