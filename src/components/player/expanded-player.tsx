"use client";

import { LectureContext } from "@/components/context/lecture-context";
import { TranscriptList } from "@/components/context/transcript-list";
import { useTranscript } from "@/components/context/use-transcript";
import { cn } from "@/lib/cn";
import { usePlayer } from "@/lib/player/store";
import { clock } from "@/lib/player/time";
import { RateChips, RepeatToggle, ShadowGapToggle } from "./player-settings";
import type { PlayerViewProps } from "./player-view";

/**
 * 펼친 재생 화면. 폰에서는 화면 전체를 덮고 조작 단추를 크게,
 * PC에서는 오른쪽 패널로 열려 본문을 가리지 않고 자막·예문 글을 크게 보인다(조작은 아래 막대).
 */
export function ExpandedPlayer({
  p,
  onClose,
}: {
  p: PlayerViewProps;
  onClose: () => void;
}) {
  const queue = usePlayer((s) => s.queue);
  const jump = usePlayer((s) => s.jump);
  // 강의처럼 자막이 있는 트랙은 지금 하는 말을 따라 보여 준다
  const transcript = useTranscript(p.track.book, p.track.item);

  return (
    <div
      role="dialog"
      aria-label="재생 화면"
      className="fixed inset-0 z-50 flex flex-col bg-bg pt-[max(env(safe-area-inset-top),1rem)] pb-[max(env(safe-area-inset-bottom),1rem)] lg:inset-auto lg:top-0 lg:right-0 lg:bottom-20 lg:w-[30rem] lg:border-l lg:border-line lg:pt-4 lg:pb-4 lg:shadow-2xl xl:w-[34rem]"
    >
      <div className="flex items-center justify-between px-5">
        <button
          type="button"
          onClick={onClose}
          className="h-11 px-1 text-2xl text-ink-soft lg:text-xl"
          aria-label="접기"
          title="접기 (Esc)"
        >
          <span className="lg:hidden">⌄</span>
          <span className="hidden lg:inline">✕</span>
        </button>
        <p className="text-sm text-ink-faint">
          {p.index + 1} / {p.queueLength}
        </p>
        <span className="w-8" />
      </div>

      {/* 글이 길어 넘치면 가운데가 아니라 위부터 놓는다(safe center). 아니면 제목이 위로 잘린다 */}
      <div className="flex min-h-0 flex-1 flex-col justify-center-safe overflow-y-auto px-7 lg:justify-start lg:overflow-hidden lg:px-5">
        <p className="text-sm text-ink-soft">{p.track.subtitle}</p>
        <h2 className="mt-1 text-3xl font-bold lg:text-2xl">{p.track.title}</h2>
        {transcript && !p.gap ? (
          <>
            <div className="mt-8 lg:hidden">
              <LectureContext
                transcript={transcript}
                book={p.track.book}
                item={p.track.item}
                size="stage"
              />
            </div>
            <TranscriptList
              transcript={transcript}
              book={p.track.book}
              item={p.track.item}
              className="mt-4 hidden min-h-0 flex-1 lg:flex"
            />
          </>
        ) : null}
        {!transcript && p.track.lines?.length ? (
          <div className="mt-8 space-y-5 lg:overflow-y-auto">
            {p.track.lines.map((l) => (
              <div key={l.ja}>
                <p lang="ja" className="text-2xl leading-relaxed lg:text-3xl">
                  {l.ja}
                </p>
                {l.ko ? <p className="mt-1 text-ink-soft">{l.ko}</p> : null}
              </div>
            ))}
          </div>
        ) : null}
        {p.gap ? (
          <p className="mt-10 animate-pulse text-center text-xl text-accent">
            따라 말해 보세요
          </p>
        ) : null}
      </div>

      {/* 폰 조작부. PC에서는 아래 막대에 같은 단추가 있다 */}
      <div className="px-7 lg:hidden">
        <input
          type="range"
          min={0}
          max={Number.isFinite(p.duration) ? p.duration : 0}
          step={0.1}
          value={p.gap ? 0 : p.pos}
          disabled={!!p.gap}
          onChange={(e) => p.onSeek(Number(e.target.value))}
          className="w-full accent-[var(--accent)]"
          aria-label="재생 위치"
        />
        <div className="flex justify-between font-mono text-xs text-ink-faint">
          <span>{clock(p.pos)}</span>
          <span>{p.gap ? clock(p.gap) : clock(p.duration)}</span>
        </div>

        <div className="mt-6 flex items-center justify-between">
          <button
            type="button"
            onClick={p.onPrev}
            className="h-14 w-14 text-2xl"
            aria-label="이전"
          >
            ⏮
          </button>
          <button
            type="button"
            onClick={() => p.onSeekBy(-5)}
            className="h-14 w-14 text-ink-soft"
            aria-label="5초 뒤로"
          >
            −5
          </button>
          <button
            type="button"
            onClick={p.onToggle}
            className="grid h-20 w-20 place-items-center rounded-full bg-accent text-3xl text-white"
            aria-label={p.paused ? "재생" : "멈춤"}
          >
            {p.paused ? "▶" : "❚❚"}
          </button>
          <button
            type="button"
            onClick={() => p.onSeekBy(5)}
            className="h-14 w-14 text-ink-soft"
            aria-label="5초 앞으로"
          >
            +5
          </button>
          <button
            type="button"
            onClick={p.onNext}
            className="h-14 w-14 text-2xl"
            aria-label="다음"
          >
            ⏭
          </button>
        </div>

        <div className="mt-6">
          <RateChips />
        </div>
        <div className="mt-3 flex justify-center gap-2 text-sm">
          <ShadowGapToggle />
          <RepeatToggle />
        </div>
      </div>

      {/* PC 패널: 막대가 좁을 때 감춰지는 간격 단추와 대기열 */}
      <div className="hidden px-5 pt-4 text-sm lg:block">
        <ShadowGapToggle className="xl:hidden" />
      </div>

      {queue.length > 1 ? (
        <details className="mt-4 px-7 text-sm lg:mt-2 lg:px-5">
          <summary className="cursor-pointer text-center text-ink-faint lg:text-left">
            목록
          </summary>
          <ol className="mt-2 max-h-48 space-y-1 overflow-y-auto">
            {queue.map((t, i) => (
              <li key={`${t.book}-${t.item}`}>
                <button
                  type="button"
                  onClick={() => jump(i)}
                  className={cn(
                    "w-full truncate py-1 text-left",
                    i === p.index ? "text-accent" : "text-ink-soft",
                  )}
                >
                  {t.title}
                </button>
              </li>
            ))}
          </ol>
        </details>
      ) : null}
    </div>
  );
}
