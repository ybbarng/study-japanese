/** 글에 든 글자 종류(한글·가나·한자)의 몫을 센다. 구간 언어를 가를 때 쓴다. */

const HANGUL = /[ᄀ-ᇿ㄰-㆏가-힯]/u;
const KANA = /[぀-ヿㇰ-ㇿｦ-ﾟ]/u;
const KANJI = /[㐀-䶿一-鿿豈-﫿]/u;
const LATIN = /[A-Za-z]/;

export type ScriptCounts = {
  hangul: number;
  kana: number;
  kanji: number;
  latin: number;
  /** 위 네 종류를 더한 것(숫자·부호·공백은 세지 않는다) */
  letters: number;
};

export function countScripts(text: string): ScriptCounts {
  const c = { hangul: 0, kana: 0, kanji: 0, latin: 0, letters: 0 };
  for (const ch of text) {
    if (HANGUL.test(ch)) c.hangul++;
    else if (KANA.test(ch)) c.kana++;
    else if (KANJI.test(ch)) c.kanji++;
    else if (LATIN.test(ch)) c.latin++;
    else continue;
    c.letters++;
  }
  return c;
}

/** 글자 가운데 일본어 글자(가나·한자)의 몫. 글자가 없으면 0 */
export function japaneseShare(text: string): number {
  const c = countScripts(text);
  return c.letters === 0 ? 0 : (c.kana + c.kanji) / c.letters;
}

/** 글자 가운데 한글의 몫. 글자가 없으면 0 */
export function hangulShare(text: string): number {
  const c = countScripts(text);
  return c.letters === 0 ? 0 : c.hangul / c.letters;
}
