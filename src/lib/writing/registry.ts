import { HIRAGANA_SET, KATAKANA_SET } from "./kana-sets";
import type { WritingSet } from "./sets";
import { type CharStrokes, type StrokeTable, tableFromFiles } from "./types";

/** 써 보기에서 고를 수 있는 글자 묶음. 새 문자는 여기에 묶음을 더한다 */
export const WRITING_SETS: readonly WritingSet[] = [HIRAGANA_SET, KATAKANA_SET];

export function writingSetById(id: string): WritingSet | undefined {
  return WRITING_SETS.find((s) => s.id === id);
}

/** 글자가 든 묶음 */
export function writingSetOf(ch: string): WritingSet | undefined {
  return WRITING_SETS.find((s) => s.has(ch));
}

const cache = new Map<string, CharStrokes>();

/**
 * 글에 든 글자들의 획 데이터를 받는다. 이미 받은 글자는 다시 받지 않고, 글자마다 그 글자가 든
 * 묶음에서만 받는다. 데이터가 없는 글자는 표에서 빠진다.
 */
export async function loadStrokes(text: string): Promise<StrokeTable> {
  const chars = [...new Set(text)];
  const missing = chars.filter((c) => !cache.has(c));
  const bySet = new Map<WritingSet, string[]>();
  for (const c of missing) {
    const set = writingSetOf(c);
    if (set) bySet.set(set, [...(bySet.get(set) ?? []), c]);
  }
  await Promise.all(
    [...bySet].map(async ([set, cs]) => {
      for (const [ch, data] of tableFromFiles(await set.load(cs)))
        cache.set(ch, data);
    }),
  );
  const table = new Map<string, CharStrokes>();
  for (const c of chars) {
    const data = cache.get(c);
    if (data) table.set(c, data);
  }
  return table;
}
