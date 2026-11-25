/**
 * 쓰기 연습이 읽는 획 데이터의 꼴. 글자(가나·한자·키릴 문자 등)와 상관없이
 * "글자 → 쓰는 차례대로 늘어선 획 경로" 하나로 돈다. 꼴과 다른 출처 데이터를 넣는 법은
 * docs/writing-practice.md "데이터 꼴".
 */

/** 획 데이터 파일 하나(src/lib/writing/data/*.json) */
export interface StrokeFile {
  /** 데이터를 어디서 가져왔는지(이름·주소) */
  source: string;
  copyright: string;
  license: string;
  /** 글자 한 칸의 한 변. 경로 좌표가 0~viewBox 안에 있다(KanjiVG는 109) */
  viewBox: number;
  /** 글자 → 획 경로(SVG path의 d) 목록. 배열 차례가 쓰는 차례, 경로 방향이 쓰는 방향이다 */
  chars: Record<string, string[]>;
}

/** 글자 하나의 획 */
export interface CharStrokes {
  viewBox: number;
  strokes: readonly string[];
}

/** 받아 둔 글자들의 획. 여러 파일을 합쳐 쓴다 */
export type StrokeTable = ReadonlyMap<string, CharStrokes>;

export function tableFromFiles(files: readonly StrokeFile[]): StrokeTable {
  const table = new Map<string, CharStrokes>();
  for (const f of files)
    for (const [ch, strokes] of Object.entries(f.chars))
      table.set(ch, { viewBox: f.viewBox, strokes });
  return table;
}

export interface Pt {
  x: number;
  y: number;
}
