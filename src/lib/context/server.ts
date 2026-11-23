import { isAdminRequest } from "@/lib/auth/server";
import { canSeeSource, sourceOfBook } from "@/lib/sources/registry";
import { readSiteSettings } from "@/lib/sources/settings";
import { getDb } from "@/lib/store/db";
import { contentDir, loadIlmuta, loadTranscript } from "@/lib/textbook/load";
import type { Ilmuta } from "@/lib/textbook/schema";
import { withoutNoise } from "@/lib/transcript/hallucination";
import {
  ilmuntaCardSource,
  ilmutaCardSource,
  lessonNoOfItem,
} from "./card-sources";
import { buildCards } from "./cards";
import type { Transcript } from "./cues";

// 서버에서 자막을 읽어 맥락 카드를 붙인다. 자막 API와 강·과 화면이 함께 쓴다.

/** 지금 요청한 사람이 볼 수 있는 책(출처를 닫았으면 로그인한 사람만) */
export async function visibleBooks(): Promise<(book: string) => boolean> {
  const admin = await isAdminRequest();
  const settings = readSiteSettings(getDb());
  return (book) => canSeeSource(sourceOfBook(book), admin, settings);
}

// 자막·교재 파일이 그대로면(readJson이 같은 객체를 돌려준다) 맞추기를 다시 하지 않는다
// (일무따 교재 객체가 바뀌거나 볼 수 있는지가 달라지면 새로 맞춘다)
type Entry = { ilmuta: Ilmuta | null; result: Transcript };
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
  const entries = cache.get(transcript) ?? [];
  const hit = entries.find((e) => e.ilmuta === ilmuta);
  if (hit) return hit.result;

  // 음악 구간에서 음성 인식이 지어낸 줄(기호만, 제작진 표기)은 내주지 않는다.
  // 카드 열쇠(segments 차례)가 어긋나지 않게 거른 뒤에 카드를 붙인다
  const segments = withoutNoise(transcript.segments);
  const clean: Transcript =
    segments.length === transcript.segments.length
      ? transcript
      : { ...transcript, segments };

  const no = lessonNoOfItem(item);
  const source =
    book === "ilmuta"
      ? ilmuta && no !== null
        ? ilmutaCardSource(ilmuta.lessons, no)
        : null
      : ilmuntaCardSource(ilmuta?.lessons ?? null);
  const withCards: Transcript = source
    ? { ...clean, cards: buildCards(clean.segments, source) }
    : clean;
  // 교재가 바뀐 옛 결과는 버리고, 볼 수 있는 경우(일무따 있음·없음) 둘까지만 둔다
  cache.set(transcript, [
    ...entries.filter((e) => e.ilmuta === null).slice(0, ilmuta ? 1 : 0),
    { ilmuta, result: withCards },
  ]);
  return withCards;
}
