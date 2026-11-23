import type { SongLine } from "./schema";

// 붙여 넣은 가사 글 ↔ 가사 줄. 가사를 고쳐 다시 붙여도 이미 맞춘 시작 시각·메모가 사라지지 않게
// 같은 글의 줄에서 이어 받는다.

/** 붙여 넣은 글을 줄로 나눈다. 앞뒤 공백을 지우고 빈 줄은 버린다 */
export function splitLyrics(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.replace(/^[\s　]+|[\s　]+$/g, ""))
    .filter((line) => line !== "");
}

/** 가사 줄을 고치기 칸에 다시 넣을 글로 */
export function lyricsText(lines: readonly Pick<SongLine, "ja">[]): string {
  return lines.map((l) => l.ja).join("\n");
}

/** 해석이 없는 줄을 해석 칸에 적는 표시 */
export const NO_KO = "-";

/** 가사 줄의 해석을 고치기 칸에 다시 넣을 글로(해석이 하나도 없으면 빈 글) */
export function koText(lines: readonly SongLine[]): string {
  if (!lines.some((l) => l.ko)) return "";
  return lines.map((l) => l.ko ?? NO_KO).join("\n");
}

export type KoResult =
  | { ok: true; lines: SongLine[] }
  | { ok: false; lyricLines: number; koLines: number };

/**
 * 붙여 넣은 해석을 가사 줄에 한 줄씩 붙인다. 빈 줄은 버리고(가사와 같은 규칙), "-"는 해석 없음.
 * 해석 칸이 비면 모든 줄의 해석을 지운다. 줄 수가 가사와 다르면 붙이지 않고 두 줄 수를 돌려준다.
 */
export function applyKo(lines: readonly SongLine[], text: string): KoResult {
  const ko = splitLyrics(text);
  if (ko.length === 0)
    return { ok: true, lines: lines.map(({ ko: _ko, ...rest }) => rest) };
  if (ko.length !== lines.length)
    return { ok: false, lyricLines: lines.length, koLines: ko.length };
  return {
    ok: true,
    lines: lines.map(({ ko: _ko, ...rest }, i) =>
      ko[i] === NO_KO ? rest : { ...rest, ko: ko[i] },
    ),
  };
}

/**
 * 새 가사 글을 줄로 바꾸며, 같은 글이었던 옛 줄의 시각·메모·해석을 이어 받는다.
 * 옛 줄을 앞에서부터 차례로 맞춰 가므로, 줄을 끼워 넣거나 지워도 후렴처럼 같은 글의 줄들이
 * 차례를 지키며 자기 시각을 가진다. 차례 안에서 못 찾으면 아직 쓰지 않은 같은 글의 줄을 쓴다.
 */
export function linesFromText(
  text: string,
  previous: readonly SongLine[],
): SongLine[] {
  const used = new Set<number>();
  let cursor = 0;
  const find = (ja: string, from: number) =>
    previous.findIndex((p, k) => k >= from && !used.has(k) && p.ja === ja);
  return splitLyrics(text).map((ja) => {
    let j = find(ja, cursor);
    if (j === -1) j = find(ja, 0);
    if (j === -1) return { ja };
    used.add(j);
    cursor = j + 1;
    return { ...previous[j], ja };
  });
}
