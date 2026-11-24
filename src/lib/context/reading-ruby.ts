import {
  type Glossary,
  hasKanji,
  type RubySegment,
  splitOkurigana,
} from "@/lib/ilmuta/ruby";
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

const byFirstCache = new WeakMap<Glossary, Map<string, string[]>>();

/** 낱말 표 열쇠를 첫 글자로 묶는다(낱말 표마다 한 번) */
function keysByFirst(glossary: Glossary): Map<string, string[]> {
  const hit = byFirstCache.get(glossary);
  if (hit) return hit;
  const out = new Map<string, string[]>();
  for (const key of Object.keys(glossary)) {
    const list = out.get(key[0]) ?? [];
    list.push(key);
    out.set(key[0], list);
  }
  byFirstCache.set(glossary, out);
  return out;
}

/**
 * 한자 덩어리 run(text의 at 자리)의 읽기를 낱말 표에서 찾는다: 덩어리 뒤 가나까지 이어진 낱말(来ない: こない)이
 * 그 자리 글과 같으면 그 낱말의 한자 부분 읽기(こ). 가장 긴 낱말 하나만 보고, 없으면 undefined
 */
function runReading(
  text: string,
  at: number,
  run: string,
  glossary: Glossary,
): string | undefined {
  let best: string | undefined;
  for (const key of keysByFirst(glossary).get(run[0]) ?? [])
    if (
      key.length > run.length &&
      key.startsWith(run) &&
      KANA_RUN.test(key.slice(run.length)) &&
      text.startsWith(key, at) &&
      (!best || key.length > best.length)
    )
      best = key;
  if (!best) return undefined;
  const head = splitOkurigana(best, glossary[best])[0];
  return head?.text === run ? head.reading : undefined;
}

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
  let at = 0;
  for (const t of tokens) {
    const start = at;
    at += t.length;
    if (KANJI_RUN.test(t)) {
      const known = glossary[t] ?? runReading(text, start, t, glossary);
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
    } else if (normalizeJa(t) !== "") {
      // 숫자·영문(3つ의 3, CD)은 읽기의 어디까지인지 모르니 한자 덩어리처럼 열린 자리로 두되 읽기는 달지 않는다.
      // 바로 앞이 열린 자리면 경계를 모르니 쓰지 않는다
      if (prevOpen) return fallback();
      pattern += "(?:.+?)";
      prevOpen = true;
    }
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
