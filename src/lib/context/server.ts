import { isAdminRequest } from "@/lib/auth/server";
import { canSeeSource, sourceOfBook } from "@/lib/sources/registry";
import { readSiteSettings } from "@/lib/sources/settings";
import { getDb } from "@/lib/store/db";
import {
  contentDir,
  loadIlmuta,
  loadTranscript,
  loadTranscriptReview,
} from "@/lib/textbook/load";
import type { Ilmuta } from "@/lib/textbook/schema";
import { contextTranscript } from "./build";
import { lessonNoOfItem } from "./card-sources";
import type { Transcript } from "./cues";
import { ilmuntaLessonPairs } from "./ilmunta-pairs";
import { koreanVocab } from "./korean-vocab-server";
import { contextExtras } from "./lesson-names-server";
import type { TranscriptReview } from "./review";
import type { TranscriptPair } from "./transcript-pairs";

// 서버에서 자막을 읽어 맥락 카드를 붙인다. 자막 API와 강·과 화면이 함께 쓴다.

/** 지금 요청한 사람이 볼 수 있는 책(출처를 닫았으면 로그인한 사람만) */
export async function visibleBooks(): Promise<(book: string) => boolean> {
  const admin = await isAdminRequest();
  const settings = readSiteSettings(getDb());
  return (book) => canSeeSource(sourceOfBook(book), admin, settings);
}

// 자막·교재 파일이 그대로면(readJson이 같은 객체를 돌려준다) 맞추기를 다시 하지 않는다
// (일무따 교재 객체·일문따 짝이 바뀌거나 볼 수 있는지가 달라지면 새로 맞춘다)
type Entry = {
  ilmuta: Ilmuta | null;
  pairs: TranscriptPair[] | null;
  review: TranscriptReview | null;
  result: Transcript;
};
const cache = new WeakMap<Transcript, Entry[]>();

/**
 * 자막에 카드를 붙여 돌려준다. 그 책을 볼 수 없거나 자막이 없으면 null.
 * 일문따 카드에 일무따 단어를 쓰는 것은 일무따 출처도 볼 수 있을 때만이다.
 */
export function loadContextTranscript(
  book: string,
  item: string,
  canSee: (book: string) => boolean,
  dir: string = contentDir(),
): Transcript | null {
  if (!canSee(book)) return null;
  const transcript = loadTranscript(book, item, dir);
  if (!transcript) return null;
  const ilmuta = canSee("ilmuta") ? loadIlmuta(dir) : null;
  const no = lessonNoOfItem(item);
  // 일문따는 그 과 문법 예문 자막에서 찾은 짝을 문장으로 쓴다
  const pairs =
    book === "ilmunta" && no !== null ? ilmuntaLessonPairs(no, dir) : null;
  // Claude가 고친 자막 줄(교정 파일). 지문이 맞는 줄만 쓴다(review.ts)
  const review = loadTranscriptReview(book, item, dir);
  const entries = cache.get(transcript) ?? [];
  const hit = entries.find(
    (e) => e.ilmuta === ilmuta && e.pairs === pairs && e.review === review,
  );
  if (hit) return hit.result;

  // 잡음 줄(기호만, 제작진 표기, 영문)과 한국어 말을 받아 적은 가타카나 줄은 내주지 않는다
  // 일무따는 그 강 등장인물 이름·분석 읽기를, 일문따는 같은 과 예문 자막 줄을 덧붙여 쓴다
  const extras = contextExtras(book, item, ilmuta, dir);
  const withCards = contextTranscript(
    book,
    item,
    transcript,
    ilmuta,
    pairs,
    extras,
    review,
    // 같은 뜻을 두 번 받아 적은 글이 다를 때 어느 쪽이 바른 말인지 볼 낱말장(소책자 뜻·낱말 뜻)
    koreanVocab(ilmuta),
  );
  // 교재·짝·교정이 바뀐 옛 결과는 버리고, 볼 수 있는 경우(일무따 있음·없음) 둘까지만 둔다
  cache.set(transcript, [
    ...entries
      .filter(
        (e) => e.ilmuta === null && e.pairs === pairs && e.review === review,
      )
      .slice(0, ilmuta ? 1 : 0),
    { ilmuta, pairs, review, result: withCards },
  ]);
  return withCards;
}
