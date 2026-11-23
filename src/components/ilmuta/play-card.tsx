"use client";

import { cn } from "@/lib/cn";
import { listenText, roughDuration } from "@/lib/ilmuta/format";
import type { ListenCount } from "@/lib/ilmuta/progress";

interface Props {
  title: string;
  note?: string;
  durationSec: number;
  count?: ListenCount;
  playing: boolean;
  onPress: () => void;
  big?: boolean;
}

/** 오디오 하나를 트는 단추: 제목·길이·들은 횟수 */
export function PlayCard({
  title,
  note,
  durationSec,
  count,
  playing,
  onPress,
  big,
}: Props) {
  const done = (count?.completedPlays ?? 0) > 0;
  return (
    <button
      type="button"
      onClick={onPress}
      aria-pressed={playing}
      className={cn(
        "flex w-full items-center gap-4 rounded-2xl text-left active:opacity-80",
        big ? "bg-accent p-5 text-white" : "bg-bg-raised p-4",
        playing && !big && "ring-1 ring-accent",
      )}
    >
      <span
        className={cn(
          "grid shrink-0 place-items-center rounded-full",
          big ? "h-14 w-14 bg-white/20 text-2xl" : "h-11 w-11 text-lg",
          !big &&
            (playing ? "bg-accent text-white" : "bg-accent-soft text-accent"),
        )}
        aria-hidden
      >
        {playing ? "❚❚" : "▶"}
      </span>
      <span className="min-w-0 flex-1">
        <span className={cn("block font-medium", big && "text-lg")}>
          {title}
        </span>
        {note ? (
          <span
            className={cn(
              "block text-sm",
              big ? "opacity-90" : "text-ink-soft",
            )}
          >
            {note}
          </span>
        ) : null}
        <span
          className={cn(
            "mt-0.5 block text-xs",
            big ? "opacity-80" : done ? "text-good" : "text-ink-faint",
          )}
        >
          {roughDuration(durationSec)} ·{listenText(count)}
        </span>
      </span>
    </button>
  );
}
