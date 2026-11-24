import {
  type Glossary,
  hasKanji,
  type RubySegment,
  splitOkurigana,
} from "@/lib/ilmuta/ruby";

// 받아 적은 글(교재 원문이 아님)에 읽는 법·낱말 칩을 달 때, 찾은 낱말이 정말 그 자리의 낱말인지 확인한다.
// 화면을 모르는 순수 함수다. 초급자는 큰 글씨 위 읽는 법과 칩을 믿으므로, 확인되지 않으면 차라리 달지 않는다.
// ① 한자 낱말 앞뒤에 한자가 붙어 있으면 더 긴 낱말(사람 이름·합성어)의 일부일 수 있다(花子 → 花+子가 아니다).
//    다만 이어진 한자 덩어리 전체가 두 글자 이상 아는 낱말로 빈틈없이 나뉘면(日本+料理) 그 낱말들로 본다.
// ② 한 글자 한자 낱말 뒤에 조사가 아닌 히라가나가 붙으면 다른 낱말의 어간일 수 있다(下さる의 下는 した가 아니다,
//    話す의 話는 はなし가 아니다). 숫자 뒤 한 글자 한자는 세는 말이다(3話).
// ③ 가타카나 낱말 앞뒤에 가타카나가 붙어 있으면 더 긴 외래어의 일부다(ウイスキー 속 スキー).

const KANJI = /[㐀-鿿豈-﫿々〆]/u;
const ALL_KANJI = /^[㐀-鿿豈-﫿々〆]+$/u;
const KATAKANA = /[ァ-ヺー]/u;
const DIGIT = /[0-9０-９]/u;
/** 한 글자 한자 명사 뒤에 바로 올 수 있는 조사·말 */
const AFTER_NOUN = /^(?:[はがをにでともへやかよねだじの]|まで)/u;
const KATAKANA_ONLY = /^[ァ-ヺー]+$/u;

function isKanji(ch: string | undefined): boolean {
  return !!ch && KANJI.test(ch);
}

/** 낱말 목록에서 ①의 덩어리 나누기에 쓸 낱말: 한자만으로 된 두 글자 이상 */
export function kanjiCompounds(forms: Iterable<string>): Set<string> {
  const out = new Set<string>();
  for (const f of forms)
    if ([...f].length >= 2 && ALL_KANJI.test(f)) out.add(f);
  return out;
}

/** text[start, end)가 compounds 낱말로 빈틈없이 나뉘나 */
function tiled(
  text: string,
  start: number,
  end: number,
  compounds: Set<string>,
) {
  const ok: boolean[] = [];
  ok[start] = true;
  for (let i = start + 1; i <= end; i++) {
    ok[i] = false;
    for (let j = Math.max(start, i - 8); j <= i - 2 && !ok[i]; j++)
      if (ok[j] && compounds.has(text.slice(j, i))) ok[i] = true;
  }
  return ok[end];
}

/** at 자리 낱말 form을 품은 이어진 한자 덩어리가 compounds 낱말로 빈틈없이 나뉘나 */
function compoundRunFits(
  text: string,
  at: number,
  form: string,
  compounds: Set<string>,
): boolean {
  if (!compounds.has(form)) return false;
  let start = at;
  while (start > 0 && isKanji(text[start - 1])) start--;
  let end = at + form.length;
  while (end < text.length && isKanji(text[end])) end++;
  return (
    tiled(text, start, at, compounds) &&
    tiled(text, at + form.length, end, compounds)
  );
}

/**
 * text의 at 자리에서 시작하는 낱말 form이 그 자리의 낱말로 확인되나.
 * 한자가 든 낱말은 ①②, 가타카나 낱말은 ③으로 본다. 히라가나 낱말은 그대로 둔다.
 * compounds는 ①에서 덩어리를 나눌 아는 낱말(kanjiCompounds). 없으면 붙은 한자가 있으면 늘 뺀다.
 */
export function wordFitsAt(
  text: string,
  at: number,
  form: string,
  compounds?: Set<string>,
): boolean {
  const before = text[at - 1];
  const after = text[at + form.length];
  if (KATAKANA_ONLY.test(form))
    return (
      !(before && KATAKANA.test(before)) && !(after && KATAKANA.test(after))
    );
  if (!hasKanji(form)) return true;
  const single = [...form].length === 1;
  const last = form[form.length - 1];
  const joined =
    (isKanji(form[0]) && isKanji(before)) || (isKanji(last) && isKanji(after));
  if (joined && !(compounds && compoundRunFits(text, at, form, compounds)))
    return false;
  // 숫자 뒤 한 글자 한자는 세는 말(3話·4人). 두 글자 이상(1時間)은 그대로 읽는다
  if (single && before && DIGIT.test(before)) return false;
  // 한 글자 한자 낱말 뒤 히라가나는 조사여야 한다
  if (single && after && /[ぁ-ゖ]/u.test(after))
    return AFTER_NOUN.test(text.slice(at + 1));
  return true;
}

/**
 * rubySegments(ruby.ts)와 같되, 자리가 확인된 낱말에만 읽는 법을 단다(앞에서부터 가장 긴 확인된 낱말).
 */
export function verifiedRubySegments(
  text: string,
  glossary: Glossary,
): RubySegment[] {
  const compounds = kanjiCompounds(Object.keys(glossary));
  const byFirst = new Map<string, string[]>();
  for (const key of Object.keys(glossary)) {
    const list = byFirst.get(key[0]) ?? [];
    list.push(key);
    byFirst.set(key[0], list);
  }
  for (const list of byFirst.values()) list.sort((a, b) => b.length - a.length);
  const out: RubySegment[] = [];
  const pushPlain = (t: string) => {
    const last = out[out.length - 1];
    if (last && last.reading === undefined) last.text += t;
    else out.push({ text: t });
  };
  let i = 0;
  while (i < text.length) {
    const hit = byFirst
      .get(text[i])
      ?.find((k) => text.startsWith(k, i) && wordFitsAt(text, i, k, compounds));
    if (hit) {
      for (const seg of splitOkurigana(hit, glossary[hit])) {
        if (seg.reading) out.push(seg);
        else pushPlain(seg.text);
      }
      i += hit.length;
    } else {
      pushPlain(text[i]);
      i++;
    }
  }
  return out;
}
