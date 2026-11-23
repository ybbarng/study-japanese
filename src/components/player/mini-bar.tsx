"use client";

import type { PlayerViewProps } from "./player-view";

/** 폰 아래 작은 막대: 제목(누르면 펼침)·재생·다음. PC에서는 감추고 DockBar를 쓴다 */
export function MiniBar({
  p,
  progress,
  cached,
  onExpand,
}: {
  p: PlayerViewProps;
  progress: number;
  cached: boolean;
  onExpand: () => void;
}) {
  return (
    <div
      data-player-bar
      className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] lg:hidden"
    >
      <div className="mx-auto max-w-md overflow-hidden rounded-2xl border border-line bg-bg-raised/95 shadow-2xl backdrop-blur">
        <div className="h-0.5 bg-line">
          <div
            className="h-full bg-accent transition-[width]"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
        <div className="flex items-center gap-3 p-3">
          <button
            type="button"
            onClick={onExpand}
            className="min-w-0 flex-1 text-left"
            aria-label="재생 화면 펼치기"
          >
            <p className="truncate font-medium">{p.track.title}</p>
            <TrackSub p={p} cached={cached} />
          </button>
          <button
            type="button"
            onClick={p.onToggle}
            className="grid h-12 w-12 place-items-center rounded-full bg-accent text-xl text-white"
            aria-label={p.paused ? "재생" : "멈춤"}
          >
            {p.paused ? "▶" : "❚❚"}
          </button>
          <button
            type="button"
            onClick={p.onNext}
            className="h-12 w-10 text-xl text-ink-soft"
            aria-label="다음"
          >
            ⏭
          </button>
        </div>
      </div>
    </div>
  );
}

/** 제목 아래 한 줄: 받아 둠 표시와 부제(간격 중이면 따라 말하기 안내) */
export function TrackSub({
  p,
  cached,
}: {
  p: PlayerViewProps;
  cached: boolean;
}) {
  return (
    <p className="truncate text-xs text-ink-soft">
      {/* 터널에 들어가기 전에 안심하도록, 지금 트랙을 받아 두었으면 표시한다 */}
      {cached ? (
        <span className="mr-1.5 text-good" title="이 기기에 받아 둠">
          ● 받아 둠
        </span>
      ) : null}
      {p.gap
        ? "따라 말해 보세요"
        : (p.track.subtitle ?? `${p.index + 1} / ${p.queueLength}`)}
    </p>
  );
}
