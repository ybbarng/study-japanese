import { cn } from "@/lib/cn";
import type { RubySegment } from "@/lib/ilmuta/ruby";
import { isPressable, type SongWord, tokenRuby } from "@/lib/songs/words";

/** 글 조각들을 <ruby>로. 읽는 법을 끄면 글만 */
export function Ruby({
  segments,
  showReading,
}: {
  segments: RubySegment[];
  showReading: boolean;
}) {
  return segments.map((s, i) =>
    s.reading && showReading ? (
      // biome-ignore lint/suspicious/noArrayIndexKey: 글 조각 차례가 곧 열쇠다
      <ruby key={i}>
        {s.text}
        <rt className="text-[0.45em] text-ink-soft">{s.reading}</rt>
      </ruby>
    ) : (
      // biome-ignore lint/suspicious/noArrayIndexKey: 글 조각 차례가 곧 열쇠다
      <span key={i}>{s.text}</span>
    ),
  );
}

export function wordRuby(w: SongWord): RubySegment[] {
  return w.tokens.flatMap(tokenRuby);
}

interface Props {
  words: SongWord[];
  showReading: boolean;
  /** 고른 낱말 차례(이 줄에 없으면 -1) */
  selected: number;
  onSelect: (index: number) => void;
  /** 가사를 가린 동안에는 누를 수 없다 */
  disabled?: boolean;
}

/** 가사 한 줄의 낱말들. 낱말마다 눌러 뜻을 찾는다 */
export function LineWords({
  words,
  showReading,
  selected,
  onSelect,
  disabled,
}: Props) {
  return (
    <span lang="ja" className="leading-[2.2]">
      {words.map((w, i) =>
        isPressable(w) && !disabled ? (
          <button
            // biome-ignore lint/suspicious/noArrayIndexKey: 같은 낱말이 한 줄에 두 번 나올 수 있다
            key={i}
            type="button"
            onClick={() => onSelect(i)}
            aria-pressed={selected === i}
            className={cn(
              "rounded-md px-0.5 underline decoration-line decoration-dotted underline-offset-[6px] hover:bg-bg-raised",
              selected === i && "bg-accent-soft text-accent decoration-accent",
            )}
          >
            <Ruby segments={wordRuby(w)} showReading={showReading} />
          </button>
        ) : (
          // biome-ignore lint/suspicious/noArrayIndexKey: 같은 낱말이 한 줄에 두 번 나올 수 있다
          <span key={i}>
            <Ruby segments={wordRuby(w)} showReading={showReading} />
          </span>
        ),
      )}
    </span>
  );
}
