import { cn } from "@/lib/cn";
import type { CueSentence, CueWord } from "@/lib/context/cards";
import { type ContextCue, cueText } from "@/lib/context/cues";

// 자막 구간 하나를 그리는 조각. 소책자 문장과 구간 전체를 맞췄으면 받아 적은 글 대신 정확한 소책자 글을
// 읽는 법·뜻과 함께 크게 보이고(CueHeadline), 일부만 맞췄으면 받아 적은 글 아래에 소책자 문장을 붙인다
// (CueExtras). 맞춘 것이 없으면 받아 적은 자막만 보인다(짧은 낱말이 한글로 적힌 곳 등).

export type CueSize = "list" | "card" | "stage";

const JA_SIZE: Record<CueSize, string> = {
  list: "text-xl",
  card: "text-3xl",
  stage: "text-4xl",
};
/** 소책자 문장은 읽는 법·뜻이 함께 붙어 길어지므로 한 단계 작게 */
const LEAD_SIZE: Record<CueSize, string> = {
  list: "text-xl",
  card: "text-2xl",
  stage: "text-3xl",
};
const KO_SIZE: Record<CueSize, string> = {
  list: "text-base",
  card: "text-xl",
  stage: "text-2xl",
};

/** 구간 전체를 소책자 문장과 맞췄는지(그러면 소책자 글이 이 말의 주인공이다) */
function leads(cue: ContextCue): boolean {
  return !!cue.card?.whole && cue.card.sentences.length > 0;
}

/** 한자 위에 읽는 법을 단 일본어 글 */
function Ruby({ s }: { s: CueSentence }) {
  return (
    <span lang="ja" className="[&_rt]:text-[0.45em]">
      {s.ruby.map((seg, i) =>
        seg.reading ? (
          // biome-ignore lint/suspicious/noArrayIndexKey: 글 조각 차례가 곧 열쇠다
          <ruby key={i}>
            {seg.text}
            <rt className="text-ink-soft">{seg.reading}</rt>
          </ruby>
        ) : (
          // biome-ignore lint/suspicious/noArrayIndexKey: 글 조각 차례가 곧 열쇠다
          <span key={i}>{seg.text}</span>
        ),
      )}
    </span>
  );
}

/**
 * 이 말의 큰 글(단추 안에 들어가도록 span만 쓴다).
 * detail이면 소책자 글에 읽는 법과 뜻까지 단다(지금 줄).
 */
export function CueHeadline({
  cue,
  size,
  detail,
}: {
  cue: ContextCue;
  size: CueSize;
  detail: boolean;
}) {
  const ja = cue.lang === "ja";
  if (detail && cue.card && leads(cue))
    return (
      <span className="block">
        {cue.card.sentences.map((s) => (
          <span key={s.ja} className="mt-1 block first:mt-0">
            <span
              className={cn(
                "block font-ja-serif leading-relaxed text-accent",
                LEAD_SIZE[size],
              )}
            >
              <Ruby s={s} />
            </span>
            {s.ko ? (
              <span className={cn("block text-ink-soft", KO_SIZE[size])}>
                {s.ko}
              </span>
            ) : null}
          </span>
        ))}
      </span>
    );
  return (
    <span
      lang={cue.lang}
      className={cn(
        "block leading-relaxed",
        ja ? cn("font-ja-serif", JA_SIZE[size]) : KO_SIZE[size],
        ja && detail && "text-accent",
      )}
    >
      {cueText(cue)}
    </span>
  );
}

function Words({ words }: { words: CueWord[] }) {
  if (words.length === 0) return null;
  return (
    <ul aria-label="이 말의 낱말" className="mt-3 flex flex-wrap gap-2">
      {words.map((w) => (
        <li
          key={w.ja}
          className="rounded-xl bg-bg-raised px-3 py-1.5 text-sm leading-tight"
        >
          <span lang="ja" className="font-ja-serif text-base text-ink">
            {w.ja}
          </span>
          {w.reading ? (
            <span lang="ja" className="ml-1.5 text-ink-soft">
              {w.reading}
            </span>
          ) : null}
          <span className="ml-1.5 text-ink-soft">{w.ko}</span>
        </li>
      ))}
    </ul>
  );
}

/** 큰 글 밑에 펼칠 것: (일부만 맞췄으면) 소책자 문장, 그리고 낱말 */
export function CueExtras({ cue }: { cue: ContextCue }) {
  const card = cue.card;
  if (!card) return null;
  const sentences = leads(cue) ? [] : card.sentences;
  if (sentences.length === 0 && card.words.length === 0) return null;
  return (
    <div>
      {sentences.length > 0 ? (
        <div className="mt-3 border-l-2 border-accent pl-3">
          <p className="text-xs text-ink-faint">소책자 문장</p>
          {sentences.map((s) => (
            <div key={s.ja} className="mt-1">
              <p className="font-ja-serif text-xl leading-relaxed text-accent">
                <Ruby s={s} />
              </p>
              {s.ko ? <p className="text-ink-soft">{s.ko}</p> : null}
            </div>
          ))}
        </div>
      ) : null}
      <Words words={card.words} />
    </div>
  );
}
