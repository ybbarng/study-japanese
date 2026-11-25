import {
  cardId,
  DAKUTEN_GRID,
  GOJUON_GRID,
  getSound,
  hasAudio,
  type Script,
  YOON_GRID,
} from "@/lib/kana/data";
import { KANA_ALTERNATE_STROKES } from "@/lib/kana/strokes";
import type { WritingItem, WritingRow, WritingSet } from "./sets";
import type { StrokeFile } from "./types";

// 가나 두 묶음. 획 데이터는 KanjiVG에서 뽑은 묶음 파일 하나씩(각 20KB 남짓)이라 통째로 받는다.
// 동적 import라 빌드에서 따로 떨어진 파일이 되고, 그 묶음을 처음 열 때만 받는다(서비스 워커가 캐시).

function item(script: Script, soundId: string): WritingItem | null {
  const sound = getSound(soundId);
  const text = script === "hira" ? sound.hira : sound.kata;
  if (!text) return null;
  return {
    text,
    hint: sound.ko,
    soundId: hasAudio(soundId) ? soundId : undefined,
    recordId: cardId(script, soundId),
  };
}

function rowsOf(script: Script): WritingRow[] {
  const row = (ids: (string | null)[], id: string): WritingRow | null => {
    const items = ids
      .filter((x): x is string => x !== null)
      .map((x) => item(script, x))
      .filter((x): x is WritingItem => x !== null);
    if (items.length === 0) return null;
    return { id, label: `${items[0].text}행`, items };
  };
  const rows: (WritingRow | null)[] = [
    ...GOJUON_GRID.map((ids, i) => {
      // わ행 끝의 を와 ん은 わ행 한 줄로 묶는다
      if (i === GOJUON_GRID.length - 1) return null;
      const more = i === GOJUON_GRID.length - 2 ? ["n"] : [];
      return row([...ids, ...more], `basic-${ids[0]}`);
    }),
    ...DAKUTEN_GRID.map((ids) => row(ids, `dakuten-${ids[0]}`)),
    ...YOON_GRID.map((ids) => row(ids, `yoon-${ids[0]}`)),
  ];
  return rows.filter((r): r is WritingRow => r !== null);
}

const inRange = (from: number, to: number) => (ch: string) => {
  const cp = ch.codePointAt(0) ?? 0;
  return cp >= from && cp <= to;
};

export const HIRAGANA_SET: WritingSet = {
  id: "hiragana",
  title: "히라가나",
  script: "히라가나",
  direction: "ltr",
  sourceId: "kanjivg",
  lang: "ja",
  rows: rowsOf("hira"),
  alternates: KANA_ALTERNATE_STROKES,
  has: inRange(0x3041, 0x3096),
  load: async () => [
    (await import("./data/kanjivg-hiragana.json")).default as StrokeFile,
  ],
};

export const KATAKANA_SET: WritingSet = {
  id: "katakana",
  title: "가타카나",
  script: "가타카나",
  direction: "ltr",
  sourceId: "kanjivg",
  lang: "ja",
  rows: rowsOf("kata"),
  alternates: KANA_ALTERNATE_STROKES,
  has: inRange(0x30a1, 0x30fa),
  load: async () => [
    (await import("./data/kanjivg-katakana.json")).default as StrokeFile,
  ],
};
