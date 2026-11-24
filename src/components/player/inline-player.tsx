"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";
import { useCachedAudio } from "@/components/offline/use-cached-audio";
import { cn } from "@/lib/cn";
import { usePlaybackClock } from "@/lib/player/clock";
import { nextCollapse } from "@/lib/player/collapse";
import { usePlayerControls } from "@/lib/player/controls";
import { currentTrack, usePlayer } from "@/lib/player/store";
import { clock } from "@/lib/player/time";

interface Props {
  /** 재생기에 아무것도 없을 때 큰 단추가 할 일(예: 이 강 강의부터 틀기) */
  idle: { label: string; onStart: () => void };
  /** 폰 위쪽(top: 내려 읽으면 한 줄로 접힌다) 또는 PC 곁칸 맨 위(panel) */
  variant: "top" | "panel";
  /** 펼쳤을 때 조작 아래에 붙일 것(폰: 지금 하는 말과 문장 카드) */
  children?: ReactNode;
  /** 한 줄로 접혔을 때도 아래에 붙일 것(폰: 지금 하는 말 한두 줄. 재생 중 자막이 늘 보이게) */
  collapsedChildren?: ReactNode;
  className?: string;
}

/** 이 화면에 재생기가 붙어 있는 동안 아래 막대를 감추게 알린다 */
function useHost() {
  useEffect(() => {
    usePlayerControls.setState((s) => ({ hosts: s.hosts + 1 }));
    return () => usePlayerControls.setState((s) => ({ hosts: s.hosts - 1 }));
  }, []);
}

/** 폰: 아래로 읽어 내려가면 접고, 위로 올리면 편다 */
function useCollapsed(enabled: boolean): [boolean, () => void] {
  const [state, setState] = useState({ collapsed: false, anchorY: 0 });
  // 접고 펼 때 재생기 높이가 바뀌면 브라우저가 스크롤 위치를 보정한다. 그 움직임을 사람이
  // 굴린 것으로 읽으면 접혔다 펴지기를 되풀이하므로, 바꾼 직후 잠깐은 무시하고 기준만 다시 잡는다
  const settleUntil = useRef(0);
  const last = useRef(state.collapsed);
  useEffect(() => {
    if (!enabled) return;
    // 재생기 높이가 바뀔 때 브라우저가 스크롤 위치를 보정하면(scroll anchoring) 굴려 가던
    // 부드러운 스크롤(단계 표·따라가기)이 중간에 끊긴다. 이 화면에서는 보정을 끈다
    const root = document.documentElement;
    const before = root.style.overflowAnchor;
    root.style.overflowAnchor = "none";
    const onScroll = () => {
      if (Date.now() < settleUntil.current) {
        setState((s) => ({ ...s, anchorY: window.scrollY }));
        return;
      }
      setState((s) => nextCollapse(s, window.scrollY));
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      root.style.overflowAnchor = before;
    };
  }, [enabled]);
  useEffect(() => {
    if (last.current === state.collapsed) return;
    last.current = state.collapsed;
    settleUntil.current = Date.now() + 350;
  }, [state.collapsed]);
  const open = () => {
    settleUntil.current = Date.now() + 350;
    setState({ collapsed: false, anchorY: window.scrollY });
  };
  return [enabled && state.collapsed, open];
}

/**
 * 강 화면 안에 붙은 재생기. 교재를 읽어 내려가는 동안에도 늘 보이고, 시간·진행 막대는 여기 한 곳에만 있다.
 * 큰 재생·멈춤 단추는 오른쪽(엄지 닿는 쪽). 5초 앞뒤, 이전·다음 트랙, A–B 구간 반복.
 * 한 문장 반복은 children(지금 하는 말)의 단추와 L 키로 건다.
 * 제목을 누르면 화면 전체 재생 화면(대기열·속도 설정)을 연다.
 */
export function InlinePlayer({
  idle,
  variant,
  children,
  collapsedChildren,
  className,
}: Props) {
  useHost();
  const track = usePlayer((s) => currentTrack(s));
  const index = usePlayer((s) => s.index);
  const queueLength = usePlayer((s) => s.queue.length);
  const setExpanded = usePlayer((s) => s.setExpanded);
  const cueLooping = usePlayer(
    (s) =>
      !!s.cueLoop &&
      s.cueLoop.book === track?.book &&
      s.cueLoop.item === track?.item,
  );
  const ab = usePlayer((s) =>
    s.abLoop && s.abLoop.book === track?.book && s.abLoop.item === track?.item
      ? s.abLoop
      : null,
  );
  const handles = usePlayerControls((s) => s.handles);
  const paused = usePlayerControls((s) => s.paused);
  const gap = usePlayerControls((s) => s.gap);
  const pos = usePlaybackClock((s) => s.pos);
  // 길이를 모르면 0(NaN을 그대로 고르면 React가 서버 값이 매번 달라진다고 본다: NaN !== NaN)
  const duration = usePlaybackClock((s) =>
    Number.isFinite(s.duration) ? s.duration : 0,
  );
  const cached = useCachedAudio(track?.src);
  const [collapsed, open] = useCollapsed(variant === "top");

  const total = gap ?? duration;
  const max = Number.isFinite(total) && total > 0 ? total : 0;
  const playing = !!track && !paused;
  const press = () => (track ? handles?.toggle() : idle.onStart());
  const playLabel = track ? (playing ? "멈춤" : "재생") : idle.label;

  const bigButton = (
    <button
      type="button"
      onClick={press}
      aria-label={playLabel}
      title={track ? `${playLabel} (Space)` : idle.label}
      className={cn(
        "grid shrink-0 place-items-center rounded-full bg-accent text-white active:opacity-80",
        collapsed ? "h-10 w-10 text-base" : "h-14 w-14 text-2xl",
      )}
    >
      {playing ? "❚❚" : "▶"}
    </button>
  );

  const time = (
    <span
      data-player-time
      className="shrink-0 text-xs text-ink-soft tabular-nums"
    >
      {track
        ? `${clock(pos)} / ${total > 0 ? clock(total) : "--:--"}`
        : "--:--"}
    </span>
  );

  return (
    <div
      data-player-bar
      data-inline-player
      data-collapsed={collapsed ? "" : undefined}
      className={cn(
        variant === "top"
          ? "sticky top-0 z-30 -mx-5 border-b border-line bg-bg/95 px-4 pt-[max(env(safe-area-inset-top),0.5rem)] pb-2 backdrop-blur"
          : "rounded-2xl bg-bg-raised p-4",
        className,
      )}
    >
      {collapsed ? (
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={open}
            aria-label="재생기 펼치기"
            className="flex min-w-0 flex-1 items-center gap-2 text-left"
          >
            <span className="min-w-0 flex-1 truncate text-sm font-medium">
              {track?.title ?? idle.label}
            </span>
            {time}
          </button>
          {bigButton}
        </div>
      ) : (
        <>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setExpanded(true)}
              aria-label="재생 화면 펼치기"
              disabled={!track}
              className="min-w-0 flex-1 text-left"
            >
              <p className="truncate font-medium">
                {track?.title ?? idle.label}
              </p>
              <p className="truncate text-xs text-ink-soft">
                {cached ? (
                  <span className="mr-1.5 text-good" title="이 기기에 받아 둠">
                    ● 받아 둠
                  </span>
                ) : null}
                {!track
                  ? "눌러서 들으세요"
                  : gap
                    ? "따라 말해 보세요"
                    : (track.subtitle ?? `${index + 1} / ${queueLength}`)}
              </p>
            </button>
            {bigButton}
          </div>
          <div className="mt-2 flex items-center gap-2">
            <input
              type="range"
              min={0}
              max={max}
              step={0.1}
              value={Math.min(pos, max)}
              disabled={!track || !!gap}
              onChange={(e) => handles?.seek(Number(e.target.value))}
              className="h-1 min-w-0 flex-1 accent-[var(--accent)]"
              aria-label="재생 위치"
            />
            {time}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-1">
            <Small
              label="5초 뒤로"
              title="5초 뒤로 (←)"
              disabled={!track}
              onClick={() => handles?.seekBy(-5)}
            >
              −5
            </Small>
            <Small
              label="이전"
              title="이전 트랙 (Shift+←)"
              disabled={!track}
              onClick={() => handles?.prev()}
            >
              ⏮
            </Small>
            <Small
              label="다음"
              title="다음 트랙 (Shift+→)"
              disabled={!track}
              onClick={() => handles?.next()}
            >
              ⏭
            </Small>
            <Small
              label="5초 앞으로"
              title="5초 앞으로 (→)"
              disabled={!track}
              onClick={() => handles?.seekBy(5)}
            >
              +5
            </Small>
            <span className="flex-1" />
            <Chip
              active={!!ab}
              disabled={!track || !!gap}
              onClick={() => handles?.markAb()}
              title="구간 반복: 시작(A)과 끝(B)을 차례로 찍고, 한 번 더 누르면 풀린다"
            >
              {!ab
                ? "A–B"
                : ab.b === null
                  ? `A ${clock(ab.a)} · B 찍기`
                  : "A–B 구간 듣는 중"}
            </Chip>
            {/* 한 문장 반복은 아래 자막 칸의 "이 문장 반복"과 L 키로. 걸려 있으면 여기서도 보인다 */}
            {cueLooping ? (
              <Chip
                active
                disabled={false}
                onClick={() => handles?.loop()}
                title="한 문장 반복 풀기 (L)"
              >
                문장 반복 풀기
              </Chip>
            ) : null}
          </div>
          {children}
        </>
      )}
      {collapsed ? (
        <div className="mt-1.5 h-0.5 bg-line">
          <div
            className="h-full bg-accent"
            style={{ width: `${max ? (Math.min(pos, max) / max) * 100 : 0}%` }}
          />
        </div>
      ) : null}
      {collapsed ? collapsedChildren : null}
    </div>
  );
}

function Small({
  label,
  title,
  disabled,
  onClick,
  children,
}: {
  label: string;
  title: string;
  disabled: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={title}
      disabled={disabled}
      className="grid h-9 min-w-9 place-items-center rounded-full px-2 text-sm text-ink-soft hover:bg-bg-sunken hover:text-ink disabled:opacity-40"
    >
      {children}
    </button>
  );
}

function Chip({
  active,
  disabled,
  onClick,
  title,
  children,
}: {
  active: boolean;
  disabled: boolean;
  onClick: () => void;
  title: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      title={title}
      disabled={disabled}
      className={cn(
        "h-8 rounded-full px-3 text-xs disabled:opacity-40",
        active
          ? "bg-accent text-white"
          : "bg-bg-sunken text-ink-soft hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}
