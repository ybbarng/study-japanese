import { romajiToKana, toHiragana } from "@/lib/kana/text";
import type { DictSummary } from "./entries";

// 사전 찾기: 표기·읽기(가타카나·로마자로 쳐도 히라가나로 맞춘다)·한국어 뜻으로 찾는다.
// 같거나 앞이 맞는 것을 먼저 보인다.

const ASCII = /^[a-z' -]+$/i;

function rank(e: DictSummary, q: string, kana: string | null): number {
  const forms = [e.word, ...e.readings.map(toHiragana)];
  const keys = kana ? [q, kana] : [q];
  if (keys.some((k) => forms.includes(k))) return 0;
  if (keys.some((k) => forms.some((f) => f.startsWith(k)))) return 1;
  if (keys.some((k) => forms.some((f) => f.includes(k)))) return 2;
  if (e.glosses.some((g) => g.includes(q))) return 3;
  return -1;
}

export function searchDictionary<T extends DictSummary>(
  entries: readonly T[],
  query: string,
  limit = 100,
): T[] {
  const raw = query.trim();
  if (raw === "") return [];
  const q = toHiragana(raw.normalize("NFKC"));
  const kana = ASCII.test(raw)
    ? romajiToKana(raw.toLowerCase(), "hira", true)
    : null;
  return entries
    .map((e) => ({ e, r: rank(e, q, kana) }))
    .filter((x) => x.r >= 0)
    .sort((a, b) => a.r - b.r)
    .slice(0, limit)
    .map((x) => x.e);
}
