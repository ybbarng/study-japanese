import { cn } from "@/lib/cn";

/** 이 문장 반복 켜고 끄기. PC에서는 L 키로도 */
export function LoopButton({
  active,
  onClick,
  className,
}: {
  active: boolean;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      title="이 문장 반복 (L)"
      className={cn(
        "shrink-0 rounded-full px-3 py-1.5 text-sm transition-colors",
        active
          ? "bg-accent text-white"
          : "bg-bg-raised text-ink-soft hover:text-ink",
        className,
      )}
    >
      <span aria-hidden>↻ </span>
      {active ? "반복 중" : "이 문장 반복"}
    </button>
  );
}
