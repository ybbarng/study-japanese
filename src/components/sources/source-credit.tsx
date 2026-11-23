import { cn } from "@/lib/cn";
import type { Source } from "@/lib/sources/registry";

interface Props {
  source: Source;
  /** 출처를 닫아 두어 방문자에게 자료를 보이지 않는 중 */
  closed?: boolean;
  className?: string;
}

/** 남의 자료를 보이는 화면에 붙이는 출처·저작권 표시 */
export function SourceCredit({ source, closed, className }: Props) {
  return (
    <aside
      className={cn(
        "rounded-2xl border border-line px-4 py-3 text-xs leading-relaxed text-ink-faint lg:px-5 lg:text-sm",
        className,
      )}
    >
      {closed ? (
        <p className="mb-2 text-sm text-warn">
          이 자료는 지금 공개하지 않습니다. 원래 자료는 아래 출판사에서 받을 수
          있습니다.
        </p>
      ) : null}
      <p>
        자료: {source.title} ·{" "}
        <a
          href={source.url}
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2"
        >
          {source.rightsHolder}
        </a>
      </p>
      <p className="mt-1">{source.notice}</p>
    </aside>
  );
}
