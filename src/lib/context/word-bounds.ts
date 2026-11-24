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
//    話す의 話는 はなし가 아니다). 숫자 뒤 한 글자 한자는 세는 말이고(3話), 가타카나 뒤 한 글자 한자는
//    접미사다(フランス人). 동사 연용형 바로 뒤 한 글자 한자는
//    합성어의 뒷부분이다(考え方). 세는 말(뜻이 ~로 시작)은 수 바로 뒤에서만 그 낱말이다(その時의 時는 じ가 아니다).
// ③ 가타카나 낱말 앞뒤에 가타카나가 붙어 있으면 더 긴 외래어의 일부다(ウイスキー 속 スキー).
// ④ 히라가나 낱말 앞에 조사가 아닌 히라가나가 붙어 있으면 다른 말의 일부일 수 있다(ないくらい 속 いくら).
// ⑤ 앞뒤로 읽기를 가를 수 없는 낱말은 달지 않는다(方: かた·ほう, を·が 앞이 아닌 何: なに·なん).

const KANJI = /[㐀-鿿豈-﫿々〆]/u;
const ALL_KANJI = /^[㐀-鿿豈-﫿々〆]+$/u;
const KATAKANA = /[ァ-ヺー]/u;
const DIGIT = /[0-9０-９]/u;
/** 한 글자 한자 명사 뒤에 바로 올 수 있는 조사·말 */
const AFTER_NOUN = /^(?:[はがをにでともへやかよねだじの]|まで)/u;
const KATAKANA_ONLY = /^[ァ-ヺー]+$/u;
/**
 * 앞뒤 글자만으로 읽기·뜻을 가를 수 없는 한 글자 한자 낱말: 方는 분(かた)일 수도, 쪽(ほう: 食べた方がいい)일 수도 있다.
 * 間는 사이(あいだ)일 수도, 間に合う의 ま일 수도 있다
 */
const AMBIGUOUS_SINGLE = new Set(["方", "間"]);
/**
 * 표기가 같고 읽기가 다른 동사의 활용한 꼴: 入れ〜(入れる いれる·入る의 가능형 はいれる),
 * 空〜(空く あく·すく), 開〜(開く あく·ひらく). 이 자리로 시작하는 낱말은 읽기를 가를 수 없다
 */
const AMBIGUOUS_VERB = /^(?:入れ|[空開][いかきくけこっ])/u;
const HIRAGANA = /[ぁ-ゖ]/u;
/**
 * 히라가나 낱말 바로 앞에 와도 되는 히라가나(조사·て형 끝). 그 밖의 히라가나 뒤면 다른 말의 일부일 수 있다
 * (ないくらい 속 いくら). な는 な형용사 끝이기도 하지만 ない의 な와 갈리지 않아 넣지 않았다
 */
const PARTICLE_BEFORE = /[はがをにでともへやのてかよね]/u;

/** ④ 히라가나로 시작하는 낱말 앞 글자(before)가 낱말 경계로 볼 만한가 */
export function hiraganaStartFits(before: string | undefined): boolean {
  return !(before && HIRAGANA.test(before) && !PARTICLE_BEFORE.test(before));
}
/** 동사 연용형의 어간 끝 가나(5단 い단·1단 え단). 조사로 흔한 に·で, い형용사 끝 い는 뺐다 */
const STEM_END = /^[きぎしちびみりえけげせべめれ]$/u;
/** 세는 말(뜻이 「~시」처럼 ~로 시작) 앞에 올 수 있는 수 */
const NUMBER_BEFORE = /[0-9０-９一二三四五六七八九十百千万何数]/u;

/**
 * 활용한 꼴(동사 연용형 등)이 그 자리의 낱말인가: 어간 끝 가나로 끝나는 꼴 바로 뒤에 한자가 오면
 * 합성어의 앞부분이다(食べ物의 食べ, 読み方의 読み)
 */
export function inflectedFitsAt(text: string, at: number, form: string) {
  const after = text[at + form.length];
  return !(STEM_END.test(form[form.length - 1]) && isKanji(after));
}

/**
 * 한 글자 세는 말(뜻이 ~로 시작하는 時 じ·人 にん 등)은 수 바로 뒤에서만 그 낱말이다
 * (その時의 時는 とき다). 세는 말이 아니면 늘 true
 */
export function counterFitsAt(
  text: string,
  at: number,
  form: string,
  ko: string,
): boolean {
  if ([...form].length !== 1 || !/^[~～]/u.test(ko)) return true;
  const before = text[at - 1];
  return !!before && NUMBER_BEFORE.test(before);
}

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
 * 한자가 든 낱말은 ①②⑤, 가타카나 낱말은 ③, 히라가나 낱말은 ④로 본다(②의 세는 말은 counterFitsAt).
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
  if (!hasKanji(form)) return hiraganaStartFits(before);
  if (AMBIGUOUS_SINGLE.has(form)) return false;
  if (AMBIGUOUS_VERB.test(form)) return false;
  // 何는 を·が 앞에서만 なに로 확실하다(何の·何で·何です는 なん)
  if (form === "何" && !/^[をが]/u.test(text.slice(at + 1))) return false;
  const single = [...form].length === 1;
  const last = form[form.length - 1];
  const joined =
    (isKanji(form[0]) && isKanji(before)) || (isKanji(last) && isKanji(after));
  if (joined && !(compounds && compoundRunFits(text, at, form, compounds)))
    return false;
  // 숫자 뒤 한 글자 한자는 세는 말(3話·4人). 두 글자 이상(1時間)은 그대로 읽는다
  if (single && before && DIGIT.test(before)) return false;
  // 가타카나 바로 뒤 한 글자 한자는 접미사다(フランス人의 人는 じん)
  if (single && before && KATAKANA.test(before)) return false;
  // 동사 연용형(한자 + 어간 끝 가나) 바로 뒤 한 글자 한자는 합성어의 뒷부분이다(考え方·読み物).
  // 조사(に·で)와 い형용사 끝(い)은 어간 끝으로 보지 않는다(高い車는 車다)
  if (single && before && STEM_END.test(before) && isKanji(text[at - 2]))
    return false;
  // 한 글자 한자 낱말 뒤 히라가나는 조사여야 한다
  if (single && after && /[ぁ-ゖ]/u.test(after))
    return AFTER_NOUN.test(text.slice(at + 1));
  return true;
}

/**
 * text의 at 바로 앞이 동사 연용형(한자 + 히라가나 1~2자, 끝은 어간 끝 가나)인가: 置き時計·呼び出し電話처럼
 * 뒤 낱말이 합성어 뒷부분이 되어 첫소리가 탁해질 수 있다(とけい → どけい).
 * 히라가나가 셋 이상이면 연용형보다 다른 말일 때가 많아(来るとき) 보지 않는다
 */
function afterVerbStem(text: string, at: number): boolean {
  if (!STEM_END.test(text[at - 1] ?? "")) return false;
  let start = at - 1;
  while (start > 0 && HIRAGANA.test(text[start - 1])) start--;
  return at - start <= 2 && isKanji(text[start - 1]);
}

/**
 * rubySegments(ruby.ts)와 같되, 자리가 확인된 낱말에만 읽는 법을 단다(앞에서부터 가장 긴 확인된 낱말).
 * 동사 연용형 바로 뒤 한자 낱말(置き時計)은 첫소리가 탁해질 수 있어 읽기를 달지 않는다.
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
    if (hit && isKanji(hit[0]) && afterVerbStem(text, i)) {
      pushPlain(hit);
      i += hit.length;
    } else if (hit) {
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
