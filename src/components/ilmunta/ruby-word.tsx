import { cn } from "@/lib/cn";
import type { Form } from "@/lib/ilmunta/conjugate";
import { furigana } from "@/lib/ilmunta/furigana";

/** 한자 위에 읽는 법을 단 일본어 낱말. `showRuby`가 꺼지면 한자만 */
export function RubyWord({
  form,
  showRuby = true,
  className,
}: {
  form: Form;
  showRuby?: boolean;
  className?: string;
}) {
  const parts = furigana(form.kanji, form.reading);
  return (
    <span lang="ja" className={cn("font-ja", className)}>
      {parts.map((p, i) =>
        p.ruby && showRuby ? (
          // biome-ignore lint/suspicious/noArrayIndexKey: 글자 조각은 차례가 곧 정체다
          <ruby key={i}>
            {p.text}
            <rt className="text-[0.45em] text-ink-soft">{p.ruby}</rt>
          </ruby>
        ) : (
          // biome-ignore lint/suspicious/noArrayIndexKey: 글자 조각은 차례가 곧 정체다
          <span key={i}>{p.text}</span>
        ),
      )}
    </span>
  );
}
