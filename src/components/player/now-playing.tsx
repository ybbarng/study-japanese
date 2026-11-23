"use client";

import { LectureContext } from "@/components/context/lecture-context";
import { useTranscript } from "@/components/context/use-transcript";
import { cn } from "@/lib/cn";
import type { Track } from "@/lib/player/queue";
import { usePlayer } from "@/lib/player/store";

interface Props {
  track: Track;
  index: number;
  queueLength: number;
  paused: boolean;
  pos: number;
  duration: number;
  /** 따라 말하기 간격 중이면 전체 길이(초) */
  gap: number | null;
  onToggle: () => void;
  onPrev: () => void;
  onNext: () => void;
  onSeek: (t: number) => void;
  onSeekBy: (delta: number) => void;
}

const RATES = [0.75, 0.9, 1, 1.15, 1.3];

function clock(sec: number): string {
  if (!Number.isFinite(sec)) return "--:--";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function NowPlaying(p: Props) {
  const expanded = usePlayer((s) => s.expanded);
  const setExpanded = usePlayer((s) => s.setExpanded);
  const progress = p.gap
    ? p.pos / p.gap
    : Number.isFinite(p.duration) && p.duration > 0
      ? p.pos / p.duration
      : 0;

  return (
    <>
      {/* 아래 막대만큼 자리를 비워 화면 끝 내용이 가려지지 않게 */}
      <div aria-hidden className="h-24" />
      <div className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(env(safe-area-inset-bottom),0.75rem)]">
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
              onClick={() => setExpanded(true)}
              className="min-w-0 flex-1 text-left"
              aria-label="재생 화면 펼치기"
            >
              <p className="truncate font-medium">{p.track.title}</p>
              <p className="truncate text-xs text-ink-soft">
                {p.gap
                  ? "따라 말해 보세요"
                  : (p.track.subtitle ?? `${p.index + 1} / ${p.queueLength}`)}
              </p>
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
      {expanded ? (
        <Expanded
          {...p}
          progress={progress}
          onClose={() => setExpanded(false)}
        />
      ) : null}
    </>
  );
}

function Expanded(p: Props & { progress: number; onClose: () => void }) {
  const {
    rate,
    setRate,
    shadowGap,
    setShadowGap,
    repeat,
    setRepeat,
    queue,
    jump,
  } = usePlayer();
  // 강의처럼 자막이 있는 트랙은 지금 하는 말을 따라 보여 준다
  const transcript = useTranscript(p.track.book, p.track.item);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-bg pt-[max(env(safe-area-inset-top),1rem)] pb-[max(env(safe-area-inset-bottom),1rem)]">
      <div className="flex items-center justify-between px-5">
        <button
          type="button"
          onClick={p.onClose}
          className="h-11 px-1 text-2xl text-ink-soft"
          aria-label="접기"
        >
          ⌄
        </button>
        <p className="text-sm text-ink-faint">
          {p.index + 1} / {p.queueLength}
        </p>
        <span className="w-8" />
      </div>

      <div className="flex flex-1 flex-col justify-center overflow-y-auto px-7">
        <p className="text-sm text-ink-soft">{p.track.subtitle}</p>
        <h2 className="mt-1 text-3xl font-bold">{p.track.title}</h2>
        {transcript && !p.gap ? (
          <div className="mt-8">
            <LectureContext
              transcript={transcript}
              book={p.track.book}
              item={p.track.item}
              size="stage"
            />
          </div>
        ) : null}
        {!transcript && p.track.lines?.length ? (
          <div className="mt-8 space-y-5">
            {p.track.lines.map((l) => (
              <div key={l.ja}>
                <p lang="ja" className="text-2xl leading-relaxed">
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

      <div className="px-7">
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

        <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-sm">
          {RATES.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRate(r)}
              className={cn(
                "rounded-full px-3 py-1.5",
                r === rate ? "bg-accent-soft text-accent" : "text-ink-soft",
              )}
            >
              {r}×
            </button>
          ))}
        </div>
        <div className="mt-3 flex justify-center gap-2 text-sm">
          <button
            type="button"
            onClick={() => setShadowGap(!shadowGap)}
            className={cn(
              "rounded-full border px-4 py-2",
              shadowGap
                ? "border-accent text-accent"
                : "border-line text-ink-soft",
            )}
          >
            따라 말하기 간격 {shadowGap ? "켬" : "끔"}
          </button>
          <button
            type="button"
            onClick={() =>
              setRepeat(
                repeat === "off" ? "all" : repeat === "all" ? "one" : "off",
              )
            }
            className={cn(
              "rounded-full border px-4 py-2",
              repeat !== "off"
                ? "border-accent text-accent"
                : "border-line text-ink-soft",
            )}
          >
            {repeat === "off"
              ? "반복 끔"
              : repeat === "all"
                ? "전체 반복"
                : "한 개 반복"}
          </button>
        </div>

        {queue.length > 1 ? (
          <details className="mt-4 text-sm">
            <summary className="cursor-pointer text-center text-ink-faint">
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
    </div>
  );
}
