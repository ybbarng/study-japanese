import { cn } from "@/lib/cn";

/** 노래 화면에 붙이는 저작권 표시. 가수 이름을 주면 함께 적는다 */
export function SongCredit({
  artist,
  className,
}: {
  artist?: string;
  className?: string;
}) {
  return (
    <aside
      className={cn(
        "rounded-2xl border border-line px-4 py-3 text-xs leading-relaxed text-ink-faint lg:px-5 lg:text-sm",
        className,
      )}
    >
      {artist ? <p>노래: {artist}</p> : null}
      <p className={artist ? "mt-1" : undefined}>
        가사·음원의 저작권은 각 권리자(작사·작곡·음반사)에게 있습니다. 개인
        학습용으로 보이며, 노래 재생은 로그인한 사람만 할 수 있습니다. 권리자가
        원하면 내립니다.
      </p>
    </aside>
  );
}
