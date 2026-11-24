import { PictureMark } from "@/components/pictures/picture-mark";
import { CueChipList } from "@/components/word-tap/cue-chip-list";
import { CueWordTaps } from "@/components/word-tap/cue-word-taps";
import { cn } from "@/lib/cn";
import type { CueSentence } from "@/lib/context/cards";
import { type ContextCue, cueText, cueUnsure } from "@/lib/context/cues";

// 자막 구간 하나를 그리는 조각. 소책자 문장과 구간 전체를 맞췄으면 받아 적은 글 대신 정확한 소책자 글을
// 읽는 법·뜻과 함께 크게 보이고(CueHeadline), 일부만 맞췄으면 받아 적은 글 아래에 소책자 문장을 붙인다
// (CueExtras). 맞춘 것이 없는 일본어 줄은 받아쓰기라 흐리게 보이고 "정확하지 않을 수 있음"을 붙인다.
// 일문따는 소책자 대신 예문 자막에서 찾은 짝을 쓰므로(origin transcript) "교재와 다를 수 있음"을 작게 붙인다.

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

/** 카드 문장이 자막에서 받아 적은 글인지(교재 원문이 아니다) */
function fromTranscript(cue: ContextCue): boolean {
  return cue.card?.origin === "transcript";
}

/** 낱말을 눌러 볼 수 있는 소책자 문장(받아 적은 글로 만든 문장은 빼고) */
export function tapSentencesOf(cue: ContextCue): string[] {
  if (!cue.card || fromTranscript(cue)) return [];
  return cue.card.sentences.map((s) => s.ja);
}

/** 받아 적은 글로 만든 문장임을 작게 알린다 */
export const TRANSCRIPT_NOTE = "자막에서 받아 적은 글 — 교재와 다를 수 있음";

/** 교재와 맞추지 못한 일본어 줄에 붙이는 알림 */
export const UNSURE_NOTE = "받아쓰기 — 정확하지 않을 수 있음";

/** 소책자에 원문이 없는 오디오의 받아 적은 줄(낱말 칩만 있고 문장 뜻은 없다) */
export const HEARD_NOTE = "받아 적은 글 · 뜻 없음";

/** 받아 적은 문장에 뜻을 찾지 못했을 때 비워 두지 않고 알린다(뜻이 빠진 줄 모르고 넘어가지 않게) */
export const NO_MEANING_NOTE = "뜻을 찾지 못한 문장";

function NoMeaning() {
  return (
    <span className="block text-sm text-ink-faint">({NO_MEANING_NOTE})</span>
  );
}

/** 교재와 맞추지 못한 줄을 문맥과 소리로 고쳐 올린 글(교정 파일)임을 작게 알린다 */
export const REVIEWED_NOTE = "고쳐 받아 적은 글 — 교재와 다를 수 있음";

function TranscriptNote({ cue }: { cue: ContextCue }) {
  return (
    <span className="mt-1 block text-xs text-ink-faint">
      {cue.card?.reviewed ? REVIEWED_NOTE : TRANSCRIPT_NOTE}
    </span>
  );
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
            ) : fromTranscript(cue) ? (
              <NoMeaning />
            ) : null}
          </span>
        ))}
        {fromTranscript(cue) ? <TranscriptNote cue={cue} /> : null}
      </span>
    );
  // 교재와 맞추지 못한 일본어 줄은 받아쓰기라 틀릴 수 있다: 작고 흐리게, 지금 줄이면 알림을 붙인다.
  // 원문이 없는 오디오에서 일본어로 볼 만한 줄(noBookText)은 잡음과 갈리게 조금 진하게, 뜻이 없다고 알린다
  if (cueUnsure(cue)) {
    const heard = !!cue.card?.noBookText;
    return (
      <span className="block">
        <span
          lang="ja"
          data-cue-heard={heard ? "" : undefined}
          className={cn(
            "block leading-relaxed",
            heard ? "font-ja-serif text-ink-soft" : "text-ink-faint",
            KO_SIZE[size],
          )}
        >
          {cueText(cue)}
        </span>
        {detail ? (
          <span className="mt-1 block text-xs text-ink-faint">
            {heard ? HEARD_NOTE : UNSURE_NOTE}
          </span>
        ) : null}
      </span>
    );
  }
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

/**
 * 폰의 좁은 "지금 하는 말" 칸에 쓰는 그림 띠: 그림이 있는 낱말만 한 줄로 작게(넘치면 옆으로 민다).
 * 낱말 칩 전체를 펼칠 자리는 없지만 걸으며 들을 때도 뜻을 그림으로 잡게 한다.
 */
export function CuePictureStrip({ cue }: { cue: ContextCue }) {
  const words = (cue.card?.words ?? []).filter((w) => w.picture || w.emoji);
  if (words.length === 0) return null;
  return (
    <ul
      aria-label="이 말의 낱말 그림"
      data-cue-picture-strip
      className="mt-2 flex gap-2 overflow-x-auto whitespace-nowrap [scrollbar-width:none]"
    >
      {words.map((w) => (
        <li
          key={w.ja}
          className="flex shrink-0 items-center gap-1 rounded-lg bg-bg-raised px-2 py-0.5 text-xs"
        >
          <PictureMark picture={w.picture} emoji={w.emoji} size={22} />
          <span lang="ja" className="font-ja-serif text-sm text-ink">
            {w.ja}
          </span>
          <span className="text-ink-soft">{w.ko}</span>
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
  // 낱말 누르기(분석이 있는 소책자 문장만, 강 화면 안에서만 그린다)
  const taps = <CueWordTaps sentences={tapSentencesOf(cue)} />;
  if (sentences.length === 0 && card.words.length === 0) return taps;
  return (
    <div>
      {taps}
      {sentences.length > 0 ? (
        <div className="mt-3 border-l-2 border-accent pl-3">
          <p className="text-xs text-ink-faint">
            {fromTranscript(cue) ? "예문" : "소책자 문장"}
          </p>
          {sentences.map((s) => (
            <div key={s.ja} className="mt-1">
              <p className="font-ja-serif text-xl leading-relaxed text-accent">
                <Ruby s={s} />
              </p>
              {s.ko ? (
                <p className="text-ink-soft">{s.ko}</p>
              ) : fromTranscript(cue) ? (
                <NoMeaning />
              ) : null}
            </div>
          ))}
          {fromTranscript(cue) ? <TranscriptNote cue={cue} /> : null}
        </div>
      ) : null}
      <CueChipList words={card.words} />
    </div>
  );
}
