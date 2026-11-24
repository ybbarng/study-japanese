import { hasKanji } from "@/lib/ilmuta/ruby";

// 회화 말풍선의 말하는 사람 이름표에 읽는 법을 단다. 이름표 자체에는 분석이 없지만,
// 대사 안에서 그 이름을 부르면 낱말 분석에 읽는 법이 있다. 그 읽기를 빌려 온다.
// 이름표는 "성 이름"처럼 띄어 쓰는데 대사에서는 이름만 부르는 일이 많아, 띄어 쓴 마디마다 찾는다.

interface Piece {
  surface: string;
  reading?: string;
}

export interface SpeakerSegment {
  text: string;
  reading?: string;
}

/** 대사 조각에서 이 글(조각 하나나 이어진 여러 조각)의 읽는 법을 찾는다. 없으면 null */
function readingOf(
  word: string,
  sentences: readonly (readonly Piece[] | null)[],
): string | null {
  for (const tokens of sentences) {
    if (!tokens) continue;
    for (let i = 0; i < tokens.length; i++) {
      let surface = "";
      let reading = "";
      for (let k = i; k < tokens.length && surface.length < word.length; k++) {
        surface += tokens[k].surface;
        reading += tokens[k].reading ?? tokens[k].surface;
      }
      if (surface === word && reading !== word) return reading;
    }
  }
  return null;
}

/** 이름표를 마디로 나눠, 대사에서 읽는 법을 찾은 한자 마디에만 읽는 법을 단다 */
export function speakerRuby(
  speaker: string,
  sentences: readonly (readonly Piece[] | null)[],
): SpeakerSegment[] {
  return speaker
    .split(/([\s・]+)/)
    .filter((part) => part !== "")
    .map((part) => {
      const reading = hasKanji(part) ? readingOf(part, sentences) : null;
      return reading ? { text: part, reading } : { text: part };
    });
}
