import { type Glossary, hasKanji, type RubySegment } from "@/lib/ilmuta/ruby";
import { normalizeJa } from "./match";
import { verifiedRubySegments } from "./word-bounds";

// 문장 전체의 읽는 법(교정 파일의 reading)을 한자 덩어리마다 나눠 단다. 화면을 모르는 순수 함수다.
// 가나 부분을 닻으로 삼아 한자 덩어리의 읽기를 가른다(山のカメラ + やまのかめら → 山=やま).
// 한자 덩어리 둘이 가나 없이 붙어 있으면(山、川 …) 어디서 끊을지 모르므로, 낱말 표에 읽기가 있는 덩어리만
// 그 읽기로 가르고 나머지는 자리가 확인된 낱말의 읽기만 단다(verifiedRubySegments). 틀린 읽기를 다느니 안 단다.

const TOKEN =
  /[㐀-鿿豈-﫿々〆]+|[ぁ-ゖァ-ヺー]+|[^㐀-鿿豈-﫿々〆ぁ-ゖァ-ヺー]+/gu;
const KANJI_RUN = /^[㐀-鿿豈-﫿々〆]+$/u;
const KANA_RUN = /^[ぁ-ゖァ-ヺー]+$/u;

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export function rubyFromReading(
  text: string,
  reading: string | null | undefined,
  glossary: Glossary,
): RubySegment[] {
  const fallback = () => verifiedRubySegments(text, glossary);
  if (!reading || !hasKanji(text)) return fallback();
  const tokens = text.match(TOKEN) ?? [];
  let pattern = "^";
  let prevOpen = false;
  for (const t of tokens) {
    if (KANJI_RUN.test(t)) {
      const known = glossary[t];
      if (known) {
        pattern += `(${escapeRegExp(normalizeJa(known))})`;
        prevOpen = false;
      } else {
        if (prevOpen) return fallback();
        pattern += "(.+?)";
        prevOpen = true;
      }
    } else if (KANA_RUN.test(t)) {
      pattern += escapeRegExp(normalizeJa(t));
      prevOpen = false;
    } else if (normalizeJa(t) !== "") return fallback(); // 숫자·영문은 읽기를 가를 수 없다
  }
  const match = new RegExp(`${pattern}$`, "u").exec(normalizeJa(reading));
  if (!match) return fallback();
  const out: RubySegment[] = [];
  let group = 1;
  for (const t of tokens) {
    if (KANJI_RUN.test(t)) {
      out.push({ text: t, reading: match[group++] });
      continue;
    }
    const last = out[out.length - 1];
    if (last && last.reading === undefined) last.text += t;
    else out.push({ text: t });
  }
  return out;
}
