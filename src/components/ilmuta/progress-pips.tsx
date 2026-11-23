import { cn } from "@/lib/cn";

/** 강의·예문을 끝까지 들었는지 작은 점으로. 첫 점(강의)은 길게 */
export function ProgressPips({ pips }: { pips: boolean[] }) {
  return (
    <span className="flex items-center gap-1" aria-hidden>
      {pips.map((on, i) => (
        <span
          // biome-ignore lint/suspicious/noArrayIndexKey: 강의·예문 차례가 곧 열쇠다
          key={i}
          className={cn(
            "h-1.5 rounded-full",
            i === 0 ? "w-4" : "w-1.5",
            on ? "bg-accent" : "bg-line",
          )}
        />
      ))}
    </span>
  );
}
