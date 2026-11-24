"use client";

import { cn } from "@/lib/cn";
import { clock } from "@/lib/player/time";
import { TrackSub } from "./mini-bar";
import { RateStepper, RepeatToggle, ShadowGapToggle } from "./player-settings";
import type { PlayerViewProps } from "./player-view";
import { useShortcutHelp } from "./use-shortcut-help";

/**
 * PC(lg 이상) 아래 도킹 막대: 탐색 오른쪽 폭 전체. 왼쪽 제목(누르면 오른쪽 패널),
 * 가운데 앞뒤·재생과 그 아래 진행 막대, 오른쪽 속도·따라 말하기 간격·반복을 펼치지 않고 바로 만진다.
 */
export function DockBar({
  p,
  cached,
  expanded,
  onExpand,
}: {
  p: PlayerViewProps;
  cached: boolean;
  expanded: boolean;
  onExpand: (on: boolean) => void;
}) {
  const openHelp = useShortcutHelp((s) => s.setOpen);
  const max = p.gap ?? (Number.isFinite(p.duration) ? p.duration : 0);
  return (
    <div
      data-player-bar
      className="fixed right-0 bottom-0 left-56 z-40 hidden border-t border-line bg-bg-raised/95 backdrop-blur lg:block"
    >
      <div className="grid h-20 grid-cols-[minmax(0,16rem)_minmax(0,1fr)_auto] items-center gap-6 px-6 xl:grid-cols-[minmax(0,20rem)_minmax(0,1fr)_auto]">
        <button
          type="button"
          onClick={() => onExpand(!expanded)}
          className="min-w-0 rounded-xl px-2 py-1 text-left hover:bg-bg-sunken"
          aria-label="재생 화면 펼치기"
          aria-expanded={expanded}
          title="자막·목록 패널 열기"
        >
          <p className="truncate font-medium">{p.track.title}</p>
          <TrackSub p={p} cached={cached} />
        </button>

        <div className="flex min-w-0 flex-col items-center gap-1">
          <div className="flex items-center gap-2">
            <IconButton
              label="5초 뒤로"
              title="5초 뒤로 (←)"
              onClick={() => p.onSeekBy(-5)}
              small
            >
              −5
            </IconButton>
            <IconButton label="이전" title="이전 (Shift+←)" onClick={p.onPrev}>
              ⏮
            </IconButton>
            <button
              type="button"
              onClick={p.onToggle}
              className="grid h-10 w-10 place-items-center rounded-full bg-accent text-lg text-white hover:opacity-90"
              aria-label={p.paused ? "재생" : "멈춤"}
              title="재생 / 멈춤 (Space)"
            >
              {p.paused ? "▶" : "❚❚"}
            </button>
            <IconButton label="다음" title="다음 (Shift+→)" onClick={p.onNext}>
              ⏭
            </IconButton>
            <IconButton
              label="5초 앞으로"
              title="5초 앞으로 (→)"
              onClick={() => p.onSeekBy(5)}
              small
            >
              +5
            </IconButton>
          </div>
          <div className="flex w-full max-w-2xl items-center gap-3">
            <span
              data-player-time
              className="w-10 text-right font-mono text-xs text-ink-faint"
            >
              {clock(p.pos)}
            </span>
            <input
              type="range"
              min={0}
              max={max}
              step={0.1}
              value={Math.min(p.pos, max)}
              disabled={!!p.gap}
              onChange={(e) => p.onSeek(Number(e.target.value))}
              className="h-1 min-w-0 flex-1 accent-[var(--accent)]"
              aria-label="재생 위치"
            />
            <span className="w-10 font-mono text-xs text-ink-faint">
              {p.gap ? clock(p.gap) : clock(p.duration)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <RateStepper />
          <ShadowGapToggle className="hidden px-3 xl:block" />
          <RepeatToggle className="px-3" />
          <button
            type="button"
            onClick={() => openHelp(true)}
            className="grid h-9 w-9 place-items-center rounded-full border border-line font-mono text-ink-soft hover:bg-bg-sunken"
            aria-label="키보드 단축키"
            title="키보드 단축키 (?)"
          >
            ?
          </button>
        </div>
      </div>
    </div>
  );
}

function IconButton({
  label,
  title,
  onClick,
  small,
  children,
}: {
  label: string;
  title: string;
  onClick: () => void;
  small?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={title}
      className={cn(
        "grid shrink-0 place-items-center rounded-full text-ink-soft hover:bg-bg-sunken hover:text-ink",
        small ? "h-8 w-9 text-xs" : "h-9 w-9 text-lg",
      )}
    >
      {children}
    </button>
  );
}
