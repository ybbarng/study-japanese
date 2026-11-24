import { cn } from "@/lib/cn";

/** 이 문장 반복 켜고 끄기. PC에서는 L 키로도 */
export function LoopButton({
  active,
  onClick,
  label = "이 문장 반복",
  hint = "(L)",
  className,
}: {
  active: boolean;
  onClick: () => void;
  /** 무엇을 반복하는지(지금 칸에 붙든 일본어와 지금 말이 함께 보일 때 둘을 가른다) */
  label?: string;
  /** 단축키 안내. L 키가 잡지 않는 단추는 비운다 */
  hint?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      title={hint ? `${label} ${hint}` : label}
      className={cn(
        "shrink-0 rounded-full px-3 py-1.5 text-sm transition-colors",
        active
          ? "bg-accent text-white"
          : "bg-bg-raised text-ink-soft hover:text-ink",
        className,
      )}
    >
      <span aria-hidden>↻ </span>
      {active ? "반복 중" : label}
    </button>
  );
}
