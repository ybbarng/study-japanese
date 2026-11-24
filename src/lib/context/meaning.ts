import type { CueWord } from "./card-schema";
import type { KoreanVocab } from "./korean-vocab";

// 받아 적은 한국어 뜻(일문따 예문 자막)의 오타를 낱말 뜻으로 바로잡는다. 화면을 모르는 순수 함수다.
// whisper는 한국어 낱말의 모음·받침 하나를 잘못 듣기도 한다(선물 → 산물, 사과 → 사관).
// 그 문장에 든 낱말(낱말 표에서 자리가 확인된 것)의 뜻이 한국어 뜻에 없는데, 자모 하나만 다른 말이
// 낱말 머리에 있으면 그것을 낱말 뜻으로 바꾼다. 맞춤법이 깨진 말이 확신 있게 보이지 않게 한다.

const HANGUL_ONLY = /^[가-힣]+$/u;

/** 한글 음절 하나의 초성·중성·종성 번호 */
function jamo(syllable: string): [number, number, number] {
  const c = syllable.charCodeAt(0) - 0xac00;
  return [Math.floor(c / 588), Math.floor((c % 588) / 28), c % 28];
}

/** 같은 길이 한글 두 말의 자모 차이 수 */
export function jamoDistance(a: string, b: string): number {
  if (a.length !== b.length) return Number.POSITIVE_INFINITY;
  let d = 0;
  for (let i = 0; i < a.length; i++) {
    if (a[i] === b[i]) continue;
    const x = jamo(a[i]);
    const y = jamo(b[i]);
    for (let k = 0; k < 3; k++) if (x[k] !== y[k]) d++;
  }
  return d;
}

/**
 * 낱말 뜻의 첫 말(쉼표·괄호 앞). 바로잡기에 쓸 만한 명사만: 한글 두 글자 이상이고, 「~다」(동사·형용사)나
 * 「~임·~음·~함·~기」(명사형으로 적은 서술어)로 끝나지 않는 말. 이런 뜻은 한국어 뜻에서 활용해 모양이 바뀐다.
 */
function headGloss(w: CueWord): string | null {
  const head = w.ko.split(/[,，(（/]/u)[0].trim();
  if (!HANGUL_ONLY.test(head) || head.length < 2) return null;
  if (/[다임음함기]$/u.test(head) || PRONOUNS.has(head)) return null;
  return head;
}

/** 조사·어미와 줄어 붙어 모양이 바뀌는 대명사(누구 → 누군가·누굴) */
const PRONOUNS = new Set([
  "누구",
  "무엇",
  "어디",
  "언제",
  "이것",
  "그것",
  "저것",
]);

/** 명사 뒤에 붙어 띄어쓴 말을 끝맺는 조사들(없어도 된다) */
const PARTICLES_TO_END =
  /^(?:[은는이가을를의도와과만]|에(?:서|게|도)?|으?로|부터|까지|처럼|보다)*(?=$|[\s\p{P}])/u;

function hasBatchim(syllable: string): boolean {
  return jamo(syllable)[2] !== 0;
}

/** 바꾼 말 뒤 조사를 받침에 맞춘다(사과+은 → 사과는) */
function fixParticle(rest: string, word: string): string {
  const batchim = hasBatchim(word.slice(-1));
  const pairs: [string, string][] = [
    ["은", "는"],
    ["이", "가"],
    ["을", "를"],
    ["과", "와"],
  ];
  for (const [withB, withoutB] of pairs) {
    const from = batchim ? withoutB : withB;
    const to = batchim ? withB : withoutB;
    if (new RegExp(`^${from}(?=$|[\\s\\p{P}])`, "u").test(rest))
      return to + rest.slice(1);
  }
  return rest;
}

/** 사람을 부르는 말(이름 뒤에 붙는다). 이 말이 붙은 곳은 이름이라 낱말 뜻으로 바꾸지 않는다 */
const TITLE = /^\s?(?:씨|군|님|상|선생)/u;

/**
 * 한국어 뜻 ko를, 그 문장에 든 낱말들(words)의 뜻으로 바로잡은 글.
 * 낱말 뜻이 ko에 없고, 띄어쓴 말 하나가 「자모 하나만 다른 같은 길이 말 + 조사」인 곳이 하나뿐일 때 바꾼다.
 * 다른 말이 붙은 합성어(아드+님)와 조사가 줄어 붙는 대명사(누가)는 건드리지 않는다.
 * 이름(뒤에 씨·군·님이 붙은 말)도 건드리지 않는다. 바꾸는 말은 일본어 글에서 자리가 확인된 낱말의 뜻이라,
 * 원래 말이 다른 뜻의 바른 낱말이어도(유리 → 料理의 요리) 문장 속 낱말 뜻을 따른다.
 */
export function repairMeaning(ko: string, words: CueWord[]): string {
  let out = ko;
  for (const w of words) {
    const gloss = headGloss(w);
    if (!gloss || out.includes(gloss)) continue;
    const spots: number[] = [];
    for (let i = 0; i + gloss.length <= out.length; i++) {
      if (i > 0 && /[가-힣]/u.test(out[i - 1])) continue;
      const piece = out.slice(i, i + gloss.length);
      if (!HANGUL_ONLY.test(piece) || jamoDistance(piece, gloss) !== 1)
        continue;
      const after = out.slice(i + gloss.length);
      if (!PARTICLES_TO_END.test(after) || TITLE.test(after)) continue;
      spots.push(i);
    }
    if (spots.length !== 1) continue;
    const at = spots[0];
    const rest = fixParticle(out.slice(at + gloss.length), gloss);
    out = out.slice(0, at) + gloss + rest;
  }
  return out;
}

// ---------------------------------------------------------------------------
// 같은 뜻을 두 번 받아 적은 글 견주기
// 일문따 강의 카드의 뜻은 예문 mp3에서 받아 적은 뜻이고, 바로 옆 강사 줄도 같은 뜻을 따로 받아 적은 글이다.
// 둘이 낱말 하나만 다르면 한쪽이 받아쓰기 오타다(닦게/닫게, 소고기/수고기). 어느 쪽이 맞는지 증거가 있을 때만
// 틀린 쪽을 맞는 쪽 말로 바꾼다. 증거가 없으면 둘 다 그대로 둔다.

const JAMO = /[ㄱ-ㅎㅏ-ㅣ]/u;
const DIGITS = /[0-9]/gu;

/** 견줄 낱말 꼴: 괄호 설명(소책자의 「(의)」)과 부호를 뺀 한글·낱자·숫자 */
function core(token: string): string {
  // NFKC는 홀로 든 낱자(ㅈ)를 다른 글자로 바꾸므로 NFC에 전각 숫자만 따로 맞춘다
  return token
    .normalize("NFC")
    .replace(/[０-９]/gu, (d) => String.fromCharCode(d.charCodeAt(0) - 0xfee0))
    .replace(/\([^)]*\)/gu, "")
    .replace(/[^가-힣ㄱ-ㅎㅏ-ㅣ0-9]/gu, "");
}

const isSyllable = (ch: string) => /^[가-힣]$/u.test(ch);

/**
 * 같은 길이 두 말의 받아쓰기 오타 거리: 음절끼리는 자모 차이, 숫자와 한글(2번/이번)·낱자와 음절(ㅈ/츠)은 1.
 * 길이가 다르면 무한
 */
export function typoDistance(a: string, b: string): number {
  const x = [...a];
  const y = [...b];
  if (x.length !== y.length) return Number.POSITIVE_INFINITY;
  let d = 0;
  for (let i = 0; i < x.length; i++) {
    if (x[i] === y[i]) continue;
    if (isSyllable(x[i]) && isSyllable(y[i])) d += jamoDistance(x[i], y[i]);
    else d += 1;
  }
  return d;
}

/** 오타로 볼 만큼 가까운가: 두 글자 이상, 다른 글자가 둘 이하, 거리 1~3 */
function typoLike(a: string, b: string): boolean {
  const x = [...a];
  const y = [...b];
  if (x.length < 2 || a === b) return false;
  const d = typoDistance(a, b);
  if (d < 1 || d > 3) return false;
  return x.filter((ch, i) => ch !== y[i]).length <= 2;
}

/** 낱말 뜻에서 견줄 말(괄호·「~다」를 뺀 앞부분). 「닦다」→「닦」, 「마나부(사람 이름)」→「마나부」 */
function glossStems(words: CueWord[]): string[] {
  const out = new Set<string>();
  for (const w of words)
    for (const piece of w.ko.split(/[,，/]/u)) {
      const stem = piece
        .replace(/\([^)]*\)/gu, "")
        .trim()
        .replace(/다$/u, "");
      if (HANGUL_ONLY.test(stem)) out.add(stem);
    }
  return [...out];
}

/** 말 x가 낱말 뜻 stem을 품나. 한 글자 stem(닦·싫)은 말 머리에 올 때만 */
function hasStem(x: string, stems: string[]): boolean {
  return stems.some((s) => (s.length === 1 ? x.startsWith(s) : x.includes(s)));
}

export interface MeaningContext {
  /** 그 카드의 일본어 글(숫자가 일본어에 있는지 본다) */
  ja: string;
  /** 그 일본어 글에 든 낱말(뜻을 증거로 쓴다) */
  words: CueWord[];
  /** 사람이 쓴 바른 한국어 글의 낱말장 */
  vocab?: KoreanVocab;
}

/**
 * 바른 글에 나오는 말인가: 통째로, 또는 끝 글자(조사·어미)를 떼어 가며 다른 글자까지 남긴 앞부분이 나오거나,
 * 그 앞부분에 「다」를 붙인 기본형이 나오면(싫지 → 싫다) 바른 말로 본다
 */
function knownWord(x: string, other: string, vocab: KoreanVocab): boolean {
  const xs = [...x];
  const ys = [...other];
  const lastDiff = Math.max(...xs.map((ch, i) => (ch === ys[i] ? -1 : i)));
  for (let n = xs.length; n >= Math.max(2, lastDiff + 1); n--)
    if (vocab.has(xs.slice(0, n).join(""))) return true;
  return vocab.has(`${xs.slice(0, lastDiff + 1).join("")}다`);
}

/** 바른 글에 한쪽만 나오는 말이면 그쪽(점심/잠심). 둘 다 바른 말이면(싫지/쉬지) 가르지 않는다 */
function vocabPick(a: string, b: string, vocab: KoreanVocab): "a" | "b" | null {
  const ka = knownWord(a, b, vocab);
  const kb = knownWord(b, a, vocab);
  if (ka === kb) return null;
  return ka ? "a" : "b";
}

/** 두 오타 후보 가운데 맞는 쪽: "a"·"b", 증거가 없으면 null */
function pickVariant(
  a: string,
  b: string,
  ctx: MeaningContext,
  allowVocab: boolean,
): "a" | "b" | null {
  // 한글 낱자가 홀로 든 말(ㅈ의)은 받아쓰기가 지어낸 것이다
  const ja = JAMO.test(a);
  const jb = JAMO.test(b);
  if (ja !== jb) return ja ? "b" : "a";
  // 일본어 글에 없는 숫자(이번 → 2번)는 받아쓰기가 바꾼 것이다
  const jaDigits = new Set(ctx.ja.normalize("NFKC").match(DIGITS) ?? []);
  const foreign = (x: string) =>
    (x.match(DIGITS) ?? []).some((d) => !jaDigits.has(d));
  const fa = foreign(a);
  const fb = foreign(b);
  if (fa !== fb) return fa ? "b" : "a";
  // 문장 속 낱말의 뜻을 품은 쪽(磨く 닦다 → 닦게)
  const stems = glossStems(ctx.words);
  const sa = hasStem(a, stems);
  const sb = hasStem(b, stems);
  if (sa !== sb) return sa ? "a" : "b";
  // 바른 글에 나오는 쪽(점심·은행). 낱말장이 작아 오타의 앞부분이 우연히 바른 말일 수 있으므로(수고기 속 수고)
  // 한쪽이 이미 믿을 만한 글(소책자·교정 파일)일 때 그 쪽을 확인하는 데만 쓴다
  return allowVocab && ctx.vocab ? vocabPick(a, b, ctx.vocab) : null;
}

/** 띄어쓴 말 열에서 i부터 n개(1·2)를 이은 꼴과, 그 자리 */
interface Span {
  at: number;
  n: number;
  core: string;
}

function spans(tokens: string[]): Span[] {
  const out: Span[] = [];
  for (let i = 0; i < tokens.length; i++)
    for (const n of [1, 2]) {
      if (i + n > tokens.length) continue;
      const c = tokens
        .slice(i, i + n)
        .map(core)
        .join("");
      if (c !== "") out.push({ at: i, n, core: c });
    }
  return out;
}

/** tokens의 span 자리를 다른 글(띄어쓴 말들)로 바꾸되, 마지막 말 뒤 부호는 남긴다 */
function replaceSpan(tokens: string[], s: Span, words: string[]): string[] {
  const last = tokens[s.at + s.n - 1];
  const tail = last.match(/[^가-힣ㄱ-ㅎㅏ-ㅣ0-9]+$/u)?.[0] ?? "";
  const lead = tokens[s.at].match(/^[^가-힣ㄱ-ㅎㅏ-ㅣ0-9(]+/u)?.[0] ?? "";
  const body = words.map((w) =>
    w.replace(/\([^)]*\)/gu, "").replace(/[^가-힣ㄱ-ㅎㅏ-ㅣ0-9]+$/u, ""),
  );
  body[0] = lead + body[0].replace(/^[^가-힣ㄱ-ㅎㅏ-ㅣ0-9]+/u, "");
  body[body.length - 1] += tail;
  return [...tokens.slice(0, s.at), ...body, ...tokens.slice(s.at + s.n)];
}

const splitWords = (t: string) => t.trim().split(/\s+/u).filter(Boolean);

/**
 * 같은 뜻을 따로 받아 적은 두 글(card: 카드 뜻, line: 강사 줄)에서 낱말 하나만 오타로 다르면 맞는 쪽으로 맞춘다.
 * 다른 자리는 같고 한 자리만 다를 때, 증거(홀로 든 낱자, 일본어에 없는 숫자, 문장 속 낱말 뜻,
 * 바른 글에 나오는 말)가 있을 때만 바꾸고, 없으면 그대로 둔다.
 * cardTrusted(소책자 글·교정 파일 뜻)면 카드는 바꾸지 않고 강사 줄만 카드 쪽으로 맞춘다.
 */
export function reconcileMeaning(
  card: string,
  line: string,
  ctx: MeaningContext,
  cardTrusted = false,
): { card: string; line: string } {
  const unchanged = { card, line };
  const ct = splitWords(card);
  const lt = splitWords(line);
  // 오타 후보: 그 자리만 다르고 나머지 말은 같은 짝. 띄어쓰기만 다른 곳(호시노시는/호시노 씨는)은 두 말을 이어 견준다
  // 증거로 가를 수 있는 짝이 하나뿐일 때만 쓴다(둘 이상이면 어느 말끼리 짝인지 모른다).
  // 나머지 말은 된소리 하나 차이를 봐주므로(거가/꺼가) 그런 짝은 증거가 없어 저절로 빠진다
  const decided: { c: Span; l: Span; winner: "a" | "b" }[] = [];
  for (const c of spans(ct))
    for (const l of spans(lt)) {
      if (c.n === 2 && l.n === 2) continue;
      if (!typoLike(c.core, l.core)) continue;
      if ((c.n === 2 || l.n === 2) && typoDistance(c.core, l.core) > 1)
        continue;
      if (!restMatches(ct, c, lt, l)) continue;
      const winner = pickVariant(c.core, l.core, ctx, cardTrusted);
      if (winner) decided.push({ c, l, winner });
    }
  if (decided.length !== 1) return unchanged;
  const { c, l, winner } = decided[0];
  if (winner === "b" && !cardTrusted)
    return {
      card: replaceSpan(ct, c, lt.slice(l.at, l.at + l.n)).join(" "),
      line,
    };
  if (winner === "a")
    return {
      card,
      line: replaceSpan(lt, l, ct.slice(c.at, c.at + c.n)).join(" "),
    };
  return unchanged;
}

/** 강사 줄 머리의 맞장구(「아니,」「네,」)는 카드 뜻에 없어도 된다 */
const LEADING_REPLY = /^[가-힣]{1,2},$/u;

/** 두 말 열에서 각 오타 자리 밖의 말이 같은가(맞장구 한 말, 된소리 하나 차이는 봐준다: 거가/꺼가) */
function restMatches(ct: string[], c: Span, lt: string[], l: Span): boolean {
  const same = (x: string[], y: string[]) =>
    x.length === y.length &&
    x.every((t, i) => {
      const a = core(t);
      const b = core(y[i]);
      return a === b || ([...a].length >= 2 && typoDistance(a, b) <= 1);
    });
  const strip = (xs: string[]) =>
    xs.length > 0 && LEADING_REPLY.test(xs[0]) ? xs.slice(1) : xs;
  const cb = ct.slice(0, c.at);
  const lb = lt.slice(0, l.at);
  const before = same(cb, lb) || same(strip(cb), lb) || same(cb, strip(lb));
  return before && same(ct.slice(c.at + c.n), lt.slice(l.at + l.n));
}
