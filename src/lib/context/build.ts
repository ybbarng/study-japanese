import type { Ilmuta, IlmutaLesson } from "@/lib/textbook/schema";
import { withoutNoise } from "@/lib/transcript/hallucination";
import {
  ilmuntaCardSource,
  ilmuntaGlossary,
  ilmutaCardSource,
  itemWithoutBookText,
  knownWordForms,
  type LessonExtras,
  lessonNoOfItem,
  looksLikeMeaning,
} from "./card-sources";
import { buildCards, type CardSource, kanaOf, reviewedCard } from "./cards";
import { conjugatedReadings } from "./conjugations";
import type { Transcript } from "./cues";
import {
  fillJamo,
  isKoreanMixed,
  kanaForRomaji,
  kanaHints,
  particlesOfFrames,
  placeholderText,
  withoutMisheardKorean,
} from "./misheard";
import {
  type PreparedReview,
  type Promotion,
  plainForm,
  prepareReview,
  promotable,
  promoteSegments,
  type TranscriptReview,
} from "./review";
import { findRepeatPairs, type TranscriptPair } from "./transcript-pairs";

// 자막 하나를 내줄 모양으로 만든다: 잡음 줄과 한국어 말을 받아 적은 가타카나 줄을 거르고 카드를 붙인다.
// 파일을 읽지 않는 순수 함수다. 서버(server.ts)와 숫자 보고(scripts/context/match-report.ts)가 함께 쓴다.

/**
 * 강 부제에 가나가 없으면(일문따, 부제 없는 일무따 강) 끝소리를 말하는 줄(「ㄱ, ㄱ로 끝나는」)의
 * 낱자를 5단 동사 끝소리로 채운다
 */
const GODAN_ENDINGS = [..."うくぐすつぬぶむる"];

/**
 * 일문따 강의가 스스로 되풀이한 문장(일본어 → 한국어 → 같은 일본어). 두 번 받아 적은 글이 닮았으니
 * 한 번만 들린 것보다 믿을 만하다. 강사가 사이에 하는 말은 뜻이 아니라 설명일 수 있어,
 * 뜻으로 볼 만할 때만(looksLikeMeaning) 짝으로 쓴다. 뜻 없는 짝은 뜻 없는 카드가 되어
 * 활용형·나눠 읽은 문장처럼 뜻이 있는 카드를 가리므로 쓰지 않는다.
 * 그 과 문법 예문 짝(pairs)과 같은 문장이면 예문 짝이 먼저 쓰인다(뜻이 있다).
 */
function selfPairs(
  segments: Transcript["segments"],
  lessons: IlmutaLesson[] | null,
): TranscriptPair[] {
  const glossary = ilmuntaGlossary(lessons);
  return findRepeatPairs(segments, {
    toKana: (t) => kanaOf(t, glossary),
    koIsMeaning: looksLikeMeaning,
  }).filter((p) => p.ko !== "");
}

/**
 * ilmuta는 일무따 교재(볼 수 없으면 null), pairs는 일문따 그 과의 문장 짝,
 * extras는 일무따 그 강의 등장인물 이름·분석 읽기(lesson-names-server.ts),
 * review는 Claude가 고친 자막 줄(교정 파일, review.ts·docs/transcript-review.md).
 * 카드 열쇠(segments 차례)가 어긋나지 않게 거른 뒤에 카드를 붙인다.
 */
export function contextTranscript(
  book: string,
  item: string,
  original: Transcript,
  ilmuta: Ilmuta | null,
  pairs: TranscriptPair[] | null,
  extras: LessonExtras | null = null,
  review: TranscriptReview | null = null,
): Transcript {
  const lessons = ilmuta?.lessons ?? null;
  // 교정 파일(review.ts): 한국어를 가나로 적은 줄은 한국어 줄로 돌리거나 숨기고, 헛것은 빼고,
  // 일본어 부분 시각이 있는 줄은 나눈다. 일본어 줄 후보는 카드를 붙인 뒤 올릴지 정한다
  const prepared = prepareReview(original.segments, review);
  const transcript: Transcript =
    prepared.segments === original.segments
      ? original
      : { ...original, segments: prepared.segments };
  // 문형 설명의 한국어 자리 말(누구누구·뭐뭐)을 가나로 받아 적은 줄과 한글이 섞인 줄은
  // 강사의 설명(한국어 줄)으로 돌린다. 그다음 한국어 말을 가나로 받아 적은 줄을 거른다
  // (돌린 줄이 한국어 줄로 세어져야 그 사이 줄을 바르게 가른다)
  let relabeled = false;
  const labeled = withoutNoise(transcript.segments).map((s) => {
    if (s.lang !== "ja") return s;
    const text =
      placeholderText(s.text, book === "ilmunta") ??
      (isKoreanMixed(s.text) ? s.text : null);
    if (text === null) return s;
    relabeled = true;
    return { ...s, text, lang: "ko" as const };
  });
  // 히라가나 줄까지 거르는 것은 강사가 한국어로 말하는 강의만(예문 mp3는 거의 일본어다)
  const known = knownWordForms(lessons);
  const segments = withoutMisheardKorean(labeled, known, {
    kanaLines: transcript.kind === "lecture",
    kanaKnown: new Set([...known, ...conjugatedReadings()]),
  });
  const clean: Transcript =
    segments.length === transcript.segments.length && !relabeled
      ? transcript
      : { ...transcript, segments };
  const no = lessonNoOfItem(item);
  const base =
    book === "ilmuta"
      ? lessons && no !== null
        ? ilmutaCardSource(lessons, no, item, extras)
        : null
      : ilmuntaCardSource(
          lessons,
          [...(pairs ?? []), ...selfPairs(clean.segments, lessons)],
          no,
          extras,
        );
  // 소책자에 원문이 없는 오디오는 맞추지 못한 줄도 받아 적은 글로 보인다(낱말 칩만, 뜻 없음)
  const source =
    base && itemWithoutBookText(book, item)
      ? { ...base, noBookText: true }
      : base;
  const cards = source ? buildCards(clean.segments, source) : {};
  // 한국어 줄에 남은 한글 낱자는 그 강이 다루는 가나·조사로 채우고(못 채우면 가린다),
  // 로마자로 적힌 일본어(조사 no 등)는 가나로 바꾼다
  const lesson =
    book === "ilmuta" ? lessons?.find((l) => l.no === no) : undefined;
  const subtitleKana = kanaHints(lesson?.subtitle);
  const hints = subtitleKana.length > 0 ? subtitleKana : GODAN_ENDINGS;
  const particles = particlesOfFrames(
    lesson?.examples.flatMap((e) => e.patterns ?? []) ?? [],
  );
  clean.segments.forEach((s, i) => {
    if (s.lang !== "ko") return;
    const card = cards[String(i)];
    const before = card?.text ?? s.text;
    const jamo = fillJamo(before, hints, particles) ?? before;
    const text = kanaForRomaji(jamo) ?? jamo;
    if (text === before) return;
    cards[String(i)] = card
      ? { ...card, text }
      : { sentences: [], whole: false, words: [], text, inferred: true };
  });
  const promoted = promoteSegments(
    clean.segments,
    cards,
    source ? reviewPromotions(prepared, source, extras, review?.threshold) : [],
  );
  const result =
    promoted.segments === clean.segments
      ? clean
      : { ...clean, segments: promoted.segments };
  return Object.keys(promoted.cards).length > 0 || source
    ? { ...result, cards: promoted.cards }
    : result;
}

/**
 * 교정 파일의 일본어 줄 후보 가운데 정상 카드로 올릴 줄(review.ts promotable).
 * 교재 낱말·등장인물 이름과 정확히 같은지는 이 강·과의 낱말 표(source.words)와 이름(extras.names)으로 본다
 */
function reviewPromotions(
  prepared: PreparedReview<Transcript["segments"][number]>,
  source: CardSource,
  extras: LessonExtras | null,
  threshold: number | undefined,
): Promotion[] {
  if (prepared.candidates.length === 0) return [];
  const known = new Set(
    [...source.words, ...(extras?.names ?? [])].map((w) => plainForm(w.ja)),
  );
  return prepared.candidates
    .filter((c) => promotable(c.line, known, threshold))
    .map((c) => {
      const text = c.line.corrected?.trim() ?? "";
      return {
        start: c.start,
        end: c.end,
        text,
        card: reviewedCard(text, c.line.reading, c.line.ko ?? "", source),
      };
    });
}
