import { parseRuby } from "@/lib/ilmunta/ruby-text";

/** `[漢字|かな]` 표기를 한자 위에 읽는 법을 단 글로 */
export function RubyText({ src }: { src: string }) {
  return (
    <>
      {parseRuby(src).map((p, i) =>
        p.ruby ? (
          // biome-ignore lint/suspicious/noArrayIndexKey: 글 조각은 차례가 곧 정체다
          <ruby key={i}>
            {p.text}
            <rt className="text-[0.45em] text-ink-soft">{p.ruby}</rt>
          </ruby>
        ) : (
          // biome-ignore lint/suspicious/noArrayIndexKey: 글 조각은 차례가 곧 정체다
          <span key={i}>{p.text}</span>
        ),
      )}
    </>
  );
}
