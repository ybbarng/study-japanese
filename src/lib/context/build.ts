import type { Ilmuta } from "@/lib/textbook/schema";
import { withoutNoise } from "@/lib/transcript/hallucination";
import {
  ilmuntaCardSource,
  ilmutaCardSource,
  knownWordForms,
  lessonNoOfItem,
} from "./card-sources";
import { buildCards } from "./cards";
import type { Transcript } from "./cues";
import { placeholderText, withoutMisheardKorean } from "./misheard";
import type { TranscriptPair } from "./transcript-pairs";

// 자막 하나를 내줄 모양으로 만든다: 잡음 줄과 한국어 말을 받아 적은 가타카나 줄을 거르고 카드를 붙인다.
// 파일을 읽지 않는 순수 함수다. 서버(server.ts)와 숫자 보고(scripts/context/match-report.ts)가 함께 쓴다.

/**
 * ilmuta는 일무따 교재(볼 수 없으면 null), pairs는 일문따 그 과의 문장 짝.
 * 카드 열쇠(segments 차례)가 어긋나지 않게 거른 뒤에 카드를 붙인다.
 */
export function contextTranscript(
  book: string,
  item: string,
  transcript: Transcript,
  ilmuta: Ilmuta | null,
  pairs: TranscriptPair[] | null,
): Transcript {
  const lessons = ilmuta?.lessons ?? null;
  const filtered = withoutMisheardKorean(
    withoutNoise(transcript.segments),
    knownWordForms(lessons),
  );
  // 문형 설명의 한국어 자리 말(누구누구·뭐뭐)을 가나로 받아 적은 줄은 강사의 설명(한국어 줄)으로 돌린다
  let relabeled = false;
  const segments = filtered.map((s) => {
    const text = s.lang === "ja" ? placeholderText(s.text) : null;
    if (text === null) return s;
    relabeled = true;
    return { ...s, text, lang: "ko" as const };
  });
  const clean: Transcript =
    segments.length === transcript.segments.length && !relabeled
      ? transcript
      : { ...transcript, segments };
  const no = lessonNoOfItem(item);
  const source =
    book === "ilmuta"
      ? lessons && no !== null
        ? ilmutaCardSource(lessons, no, item)
        : null
      : ilmuntaCardSource(lessons, pairs ?? [], no);
  return source
    ? { ...clean, cards: buildCards(clean.segments, source) }
    : clean;
}
