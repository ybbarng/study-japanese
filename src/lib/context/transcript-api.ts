import type { Transcript } from "./card-schema";

// 자막 API(/api/transcripts/<book>/<item>) 주소와, 받은 JSON을 화면에서 쓸지 가볍게 보는 일.
// 재생기는 모든 화면에 있으므로 zod 스키마 대신 겉모양만 본다(서버가 스키마로 확인해 내준다).
// 받아 두기(lib/offline)도 같은 주소를 캐시에 넣어 끊겨도 자막이 나오게 한다.

/** 재생기와 받아 두기가 같은 주소를 쓰게 한 곳에서 만든다 */
export function transcriptApiUrl(book: string, item: string): string {
  return `/api/transcripts/${book}/${item}`;
}

/** 자막처럼 생겼으면 그대로, 아니면 null */
export function asTranscript(value: unknown): Transcript | null {
  if (typeof value !== "object" || value === null) return null;
  const v = value as Partial<Transcript>;
  if (typeof v.book !== "string" || typeof v.item !== "string") return null;
  if (!Array.isArray(v.segments)) return null;
  const ok = v.segments.every(
    (s) =>
      typeof s === "object" &&
      s !== null &&
      typeof s.start === "number" &&
      typeof s.end === "number" &&
      typeof s.text === "string" &&
      (s.lang === "ja" || s.lang === "ko"),
  );
  if (!ok) return null;
  if (
    v.cards !== undefined &&
    (typeof v.cards !== "object" || v.cards === null)
  )
    return null;
  return value as Transcript;
}

/** 자막 카드에 붙은 그린 낱말 그림 id(중복 없이). 받아 두기가 그림 파일을 함께 받는다 */
export function cardPictureIds(t: Transcript): string[] {
  const ids = new Set<string>();
  for (const card of Object.values(t.cards ?? {}))
    for (const w of card.words) if (w.picture) ids.add(w.picture);
  return [...ids];
}
