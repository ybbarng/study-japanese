import { dictionaryIndex } from "@/lib/dictionary/index-server";
import { VERBS } from "@/lib/ilmunta/verbs";
import { ADJECTIVES } from "@/lib/ilmunta/words";
import type { Ilmuta } from "@/lib/textbook/schema";
import { buildKoreanVocab, type KoreanVocab } from "./korean-vocab";

// 바른 한국어 낱말장(korean-vocab.ts)의 재료를 모은다(서버만): 일무따 소책자 뜻, 사전 색인 뜻, 드릴 낱말 뜻.
// 교재 객체가 그대로면 한 번만 만든다.

let cache: { book: Ilmuta | null; vocab: KoreanVocab } | null = null;

export function koreanVocab(book: Ilmuta | null): KoreanVocab {
  if (cache && cache.book === book) return cache.vocab;
  const lines: string[] = [];
  for (const l of book?.lessons ?? []) {
    if (l.titleKo) lines.push(l.titleKo);
    for (const e of l.examples) for (const s of e.sentences) lines.push(s.ko);
    for (const s of l.conversationWords ?? []) lines.push(s.ko);
  }
  for (const e of dictionaryIndex(book).entries) lines.push(...e.glosses);
  for (const w of [...VERBS, ...ADJECTIVES]) lines.push(w.ko);
  const vocab = buildKoreanVocab(lines);
  cache = { book, vocab };
  return vocab;
}
