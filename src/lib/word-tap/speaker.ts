import { hasKanji } from "@/lib/ilmuta/ruby";

// 회화 말풍선의 말하는 사람 이름표에 읽는 법을 단다. 이름표 자체에는 분석이 없지만,
// 대사 안에서 그 이름을 부르면 낱말 분석에 읽는 법이 있다. 그 읽기를 빌려 온다.

interface Piece {
  surface: string;
  reading?: string;
}

/**
 * 대사들의 낱말 조각에서 이름표와 같은 글(조각 하나나 이어진 여러 조각)을 찾아 읽는 법을 돌려준다.
 * 한자가 없는 이름이거나 찾지 못하면 null.
 */
export function speakerReading(
  speaker: string,
  sentences: readonly (readonly Piece[] | null)[],
): string | null {
  if (!hasKanji(speaker)) return null;
  for (const tokens of sentences) {
    if (!tokens) continue;
    for (let i = 0; i < tokens.length; i++) {
      let surface = "";
      let reading = "";
      for (
        let k = i;
        k < tokens.length && surface.length < speaker.length;
        k++
      ) {
        surface += tokens[k].surface;
        reading += tokens[k].reading ?? tokens[k].surface;
      }
      if (surface === speaker && reading !== speaker) return reading;
    }
  }
  return null;
}
