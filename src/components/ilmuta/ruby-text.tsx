import { cn } from "@/lib/cn";
import {
  type Glossary,
  hasKanji,
  type RubySegment,
  rubySegments,
  splitOkurigana,
} from "@/lib/ilmuta/ruby";

interface Props {
  text: string;
  /** 낱말 자체의 읽는 법(단어 카드) */
  reading?: string;
  /** 문장이면 배운 단어 사전으로 읽는 법을 단다 */
  glossary?: Glossary;
  showReading?: boolean;
  className?: string;
}

function segments(text: string, reading?: string, glossary?: Glossary) {
  if (reading && reading !== text && hasKanji(text))
    return splitOkurigana(text, reading);
  if (glossary) return rubySegments(text, glossary);
  return [{ text }] satisfies RubySegment[];
}

/** 일본어 글. 읽는 법을 켜면 한자 위에 후리가나(<ruby>)를 단다 */
export function RubyText({
  text,
  reading,
  glossary,
  showReading = true,
  className,
}: Props) {
  if (!showReading)
    return (
      <span lang="ja" className={className}>
        {text}
      </span>
    );
  return (
    <span lang="ja" className={cn("[&_rt]:text-[0.45em]", className)}>
      {segments(text, reading, glossary).map((s, i) =>
        s.reading ? (
          // biome-ignore lint/suspicious/noArrayIndexKey: 글 조각 차례가 곧 열쇠다
          <ruby key={i}>
            {s.text}
            <rt className="text-ink-soft">{s.reading}</rt>
          </ruby>
        ) : (
          // biome-ignore lint/suspicious/noArrayIndexKey: 글 조각 차례가 곧 열쇠다
          <span key={i}>{s.text}</span>
        ),
      )}
    </span>
  );
}
