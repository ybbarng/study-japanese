import { hasKanji, splitOkurigana } from "@/lib/ilmuta/ruby";
import type { CueCard, CueSentence, CueWord } from "./cards";
// cards.ts가 이 파일을 부르므로 여기서는 타입만 가져온다
import { compatible, normalizeJa } from "./match";
import {
  hangulMatchScore,
  hangulPhones,
  kanaPhones,
  phoneSimilarity,
} from "./phonetic";
import { betterTranscription } from "./transcript-pairs";

// 소책자 문장과 바로 맞추지 못한 자막 구간을 앞뒤 맥락과 소리로 한 번 더 살핀다. 화면을 모르는 순수 함수다.
// whisper는 강사가 일본어를 말하는 순간에 자주 틀린다.
// ① 일본어 구간이 엉뚱한 가나로 적힌다: 바로 앞뒤에서 맞춘 문장과 소리가 닮았거나, 같은 문장 사이에
//    끼어 있으면(낱말 → 뜻 → 낱말) 그 문장으로 본다. 같은 문장을 두 번째 말할 때도 여기서 붙는다.
// ② 한국어 구간 속 일본어 낱말이 한글 소리로 적힌다(すきな → 스키나): 그 강·과의 낱말을 한글 소리와
//    견줘 찾고, 찾은 자리에 일본어 표기를 덧붙이고 낱말 칩을 단다. 구간이 통째로 낱말이면 그 낱말 카드로.
// ③ 맞추지 못한 "일본어 → 뜻 → 일본어" 되풀이는 둘 중 나은 받아쓰기를 두 줄 모두에 보인다.
// 원래 자막 파일은 바꾸지 않고 내줄 때 카드에 덧붙인다.

export interface RepairSegment {
  text: string;
  lang: "ko" | "ja";
  start?: number;
}

/** 이웃으로 볼 거리: 앞뒤 구간 수와 시각(초) */
const NEAR_SEGMENTS = 3;
const NEAR_SEC = 12;
/** 이웃 문장과 소리가 이만큼 닮으면 같은 문장을 다시 말한 것으로 본다 */
const NEIGHBOR_SIMILARITY = 0.65;
const KANJI_NEIGHBOR_SIMILARITY = 0.85;
/** 제대로 받아 적었을 맞장구(앞뒤 문장으로 덮지 않는다) */
const ANSWERS = new Set(["はい", "いいえ", "うん", "ううん", "ええ", "いや"]);
/** 소리로 비교할 최소 자모 수(짧으면 아무 말과도 닮는다) */
const MIN_PHONES = 4;
/** 한글 소리로 찾을 낱말의 최소 가나 수(した·うた 같은 두 글자 낱말은 한국어 말과 잘 닮는다) */
const MIN_HANGUL_KANA = 3;
/**
 * 강의에 자주 나오는데 일본어 낱말과 소리가 닮는 한국어 낱말(전체 강의 결과를 보고 골랐다).
 * 강마다 머리로 나오는 단계 이름(기본 단어 익히기)이 きぼう 등과, 쓰기·아침 같은 말이 スキー·しゃしん과 닮는다.
 * 한국어와 뜻도 같은 낱말(시간·요리)은 덧붙여도 틀리지 않아 두었다.
 */
const KOREAN_WORDS = new Set([
  "기본",
  "대화",
  "쓰기",
  "쓰지",
  "않고",
  "대답",
  "자기",
  "추가",
  "아침",
  "아니다",
  "까지",
  "까지라",
  "시기",
  "그다지",
  "주시",
]);
/** 띄어 받아 적은 낱말 뒤에 올 수 있는 한 글자 조사 */
const JOIN_TAILS = new Set([..."는은가이를을로도라랑와과에의"]);
/** 맞추지 못한 되풀이 두 줄을 같은 문장으로 볼 기준 */
const PAIR_SIMILARITY = 0.8;
/** 구간 통째를 낱말로 볼 때 한글이 이만큼 이하여야 한다(긴 설명은 통째로 보지 않는다) */
const MAX_WHOLE_SYLLABLES = 8;

function leads(card: CueCard | undefined): boolean {
  return !!card?.whole && card.sentences.length > 0;
}

function sentenceKana(s: CueSentence): string {
  return s.ruby.map((r) => r.reading ?? r.text).join("");
}

/** 낱말을 카드 문장으로(읽는 법은 교재 낱말의 것만) */
export function wordSentence(w: CueWord): CueSentence {
  const ruby =
    w.reading && w.reading !== w.ja && hasKanji(w.ja)
      ? splitOkurigana(w.ja, w.reading)
      : [{ text: w.ja }];
  return { ja: w.ja, ko: w.ko, ruby };
}

/** 낱말의 가나 표기(한자에 읽는 법이 없으면 비교할 수 없다) */
function wordKana(w: CueWord): string | null {
  if (w.reading) return w.reading;
  return hasKanji(w.ja) ? null : w.ja;
}

interface Focus {
  word: CueWord;
  kana: string;
  phones: string;
}

function focusOf(words: CueWord[]): Focus[] {
  const out: Focus[] = [];
  const seen = new Set<string>();
  for (const word of words) {
    const kana = wordKana(word);
    if (!kana || seen.has(word.ja)) continue;
    seen.add(word.ja);
    const phones = kanaPhones(kana);
    if (phones.length >= MIN_PHONES) out.push({ word, kana, phones });
  }
  return out;
}

/** 한글 소리로 찾을 낱말(가나 세 글자 이상) */
function hangulFocus(words: CueWord[]): Focus[] {
  return focusOf(words).filter((f) => [...f.kana].length >= MIN_HANGUL_KANA);
}

function near(segments: RepairSegment[], i: number, j: number): boolean {
  if (Math.abs(i - j) > NEAR_SEGMENTS) return false;
  const a = segments[i].start;
  const b = segments[j].start;
  return a === undefined || b === undefined || Math.abs(a - b) <= NEAR_SEC;
}

/** i 앞(dir -1)이나 뒤(dir 1)로 가장 가까운, 문장을 통째 맞춘 일본어 구간 */
function nearestLead(
  segments: RepairSegment[],
  cards: Record<string, CueCard>,
  i: number,
  dir: -1 | 1,
): number {
  for (
    let j = i + dir;
    j >= 0 && j < segments.length && near(segments, i, j);
    j += dir
  )
    if (leads(cards[String(j)])) return j;
  return -1;
}

function sameSentences(a: CueCard, b: CueCard): boolean {
  return (
    a.sentences.length === b.sentences.length &&
    a.sentences.every((s, k) => s.ja === b.sentences[k].ja)
  );
}

/**
 * ① 맞추지 못한 일본어 구간을 이웃의 맞춘 문장으로 채운다.
 * 이웃 문장과 소리가 닮았거나, 앞뒤 가장 가까운 맞춘 구간이 같은 문장이면(그 사이에 끼었으면).
 */
function fillFromNeighbors(
  segments: RepairSegment[],
  cards: Record<string, CueCard>,
  toKana: (t: string) => string,
): void {
  const base = { ...cards };
  segments.forEach((seg, i) => {
    if (seg.lang !== "ja" || leads(base[String(i)])) return;
    const plain = normalizeJa(seg.text);
    if (ANSWERS.has(plain)) return;
    const before = nearestLead(segments, base, i, -1);
    const after = nearestLead(segments, base, i, 1);
    const options = [before, after].filter((j) => j >= 0);
    if (options.length === 0) return;
    const phones = kanaPhones(toKana(seg.text));
    // 낱말만 바꾼 다른 문장(お客さん/お土産)이나 긍정·부정이 뒤집힌 문장은 같은 문장이 아니다
    const fits = (card: CueCard) =>
      card.sentences.some((s) => compatible(plain, normalizeJa(s.ja)));
    // 한자가 든 줄은 대개 뜻 있는 일본어를 받아 적은 것이라(折る/折れる) 거의 같을 때만 덮는다
    const need = hasKanji(seg.text)
      ? KANJI_NEIGHBOR_SIMILARITY
      : NEIGHBOR_SIMILARITY;
    let pick = -1;
    let best = 0;
    if (phones.length >= MIN_PHONES - 1)
      for (const j of options) {
        const card = base[String(j)];
        if (!fits(card)) continue;
        const score = phoneSimilarity(
          phones,
          kanaPhones(card.sentences.map(sentenceKana).join("")),
        );
        if (score >= need && score > best) {
          best = score;
          pick = j;
        }
      }
    // 같은 문장 사이에 낀 줄: 한자가 든 줄은 제대로 받아 적은 다른 말일 수 있어 가나 줄만 본다
    if (
      pick < 0 &&
      before >= 0 &&
      after >= 0 &&
      !hasKanji(seg.text) &&
      sameSentences(base[String(before)], base[String(after)]) &&
      fits(base[String(before)])
    )
      pick = before;
    if (pick < 0) return;
    cards[String(i)] = { ...base[String(pick)], inferred: true };
  });
}

/** 한글이 이어진 조각과 그 시작 위치 */
function hangulRuns(text: string): { text: string; at: number }[] {
  return [...text.matchAll(/[가-힣]+/g)].map((m) => ({
    text: m[0],
    at: m.index ?? 0,
  }));
}

export interface HangulHit {
  /** 글 속 위치(한글 조각에서 낱말로 본 앞부분의 끝) */
  end: number;
  word: CueWord;
  score: number;
}

/**
 * 한국어 글 속에서 한글 소리로 적힌 낱말을 찾는다.
 * 한글 조각마다 앞에서부터 두 글자 이상을 떼어 낱말 소리와 견준다(뒤는 한국어 조사로 본다: 스키+나).
 */
export function findHangulWords(text: string, words: CueWord[]): HangulHit[] {
  const focus = hangulFocus(words);
  const out: HangulHit[] = [];
  const runs = hangulRuns(text);
  let skipTo = -1;
  runs.forEach((run, r) => {
    if (run.at < skipTo) return;
    let hit: HangulHit | null = null;
    for (let k = 2; k <= run.text.length; k++) {
      const piece = run.text.slice(0, k);
      if (KOREAN_WORDS.has(piece)) continue;
      const phones = hangulPhones(piece);
      for (const f of focus) {
        const score = hangulMatchScore(phones, f.phones);
        if (score > 0 && score > (hit?.score ?? 0))
          hit = { end: run.at + k, word: f.word, score };
      }
    }
    // 한 낱말을 띄어 받아 적기도 한다(にがてな → 니가 때나). 이 조각만으로 못 찾았으면 빈칸 하나 건너
    // 다음 조각까지 이어 본다. 두 한국어 낱말이 우연히 닮기 쉬워(꼭 조사 → こうこう) 소리가 똑같고,
    // 다음 조각 끝이나 한 글자 조사 앞에서 끝날 때만 받는다.
    const next = runs[r + 1];
    if (!hit && next && text.slice(run.at + run.text.length, next.at) === " ")
      for (let k = 1; k <= next.text.length; k++) {
        const rest = next.text.slice(k);
        if (rest !== "" && !JOIN_TAILS.has(rest)) continue;
        const phones = hangulPhones(run.text + next.text.slice(0, k));
        const f = focus.find((x) => x.phones === phones);
        if (f) hit = { end: next.at + k, word: f.word, score: 1 };
      }
    if (hit) {
      out.push(hit);
      skipTo = hit.end;
    }
  });
  return out;
}

/** 찾은 자리 뒤에 일본어 표기를 덧붙인 글 */
export function annotate(text: string, hits: HangulHit[]): string {
  let out = "";
  let from = 0;
  for (const h of [...hits].sort((a, b) => a.end - b.end)) {
    out += `${text.slice(from, h.end)}(${h.word.ja})`;
    from = h.end;
  }
  return out + text.slice(from);
}

/**
 * ② 한국어 구간 속 한글로 적힌 일본어. 구간이 통째로 낱말(또는 이웃 문장)이면 그 카드로 바꾸고,
 * 아니면 찾은 자리에 일본어를 덧붙이고 낱말 칩을 단다.
 */
function fillHangul(
  segments: RepairSegment[],
  cards: Record<string, CueCard>,
  words: CueWord[],
): void {
  const base = { ...cards };
  segments.forEach((seg, i) => {
    if (seg.lang !== "ko" || cards[String(i)]) return;
    const hangul = hangulRuns(seg.text)
      .map((r) => r.text)
      .join("");
    if (hangul.length >= 2 && hangul.length <= MAX_WHOLE_SYLLABLES) {
      const phones = hangulPhones(hangul);
      const choices: {
        sentences: CueSentence[];
        kana: string;
        from?: CueCard;
      }[] = [
        ...hangulFocus(words).map((f) => ({
          sentences: [wordSentence(f.word)],
          kana: f.kana,
        })),
        ...[
          nearestLead(segments, base, i, -1),
          nearestLead(segments, base, i, 1),
        ]
          .filter((j) => j >= 0)
          .map((j) => base[String(j)])
          .map((c) => ({
            sentences: c.sentences,
            kana: c.sentences.map(sentenceKana).join(""),
            from: c,
          })),
      ];
      let best: (typeof choices)[number] | null = null;
      let bestScore = 0;
      for (const c of choices) {
        const target = kanaPhones(c.kana);
        if (Math.max(phones.length, target.length) < MIN_PHONES) continue;
        const score = hangulMatchScore(phones, target);
        if (score > bestScore) {
          best = c;
          bestScore = score;
        }
      }
      if (best) {
        cards[String(i)] = best.from
          ? { ...best.from, inferred: true }
          : {
              sentences: best.sentences,
              whole: true,
              words: [],
              inferred: true,
            };
        return;
      }
    }
    // 맞춘 문장 바로 뒤의 한국어 줄은 그 문장의 뜻이다(사진·요리처럼 한국어와 소리가 같은 낱말이 많다)
    if (leads(base[String(i - 1)])) return;
    const hits = findHangulWords(seg.text, words);
    if (hits.length === 0) return;
    const chips: CueWord[] = [];
    for (const h of hits)
      if (!chips.some((w) => w.ja === h.word.ja)) chips.push(h.word);
    cards[String(i)] = {
      sentences: [],
      whole: false,
      words: chips,
      text: annotate(seg.text, hits),
      inferred: true,
    };
  });
}

/** 가나로 받아 적은 일본어 구간 속 낱말을 읽는 법으로 찾는다(得意를 とくい로 적은 곳) */
function kanaWords(text: string, words: CueWord[]): CueWord[] {
  const plain = normalizeJa(text);
  return focusOf(words)
    .filter(
      (f) => [...f.kana].length >= 3 && plain.includes(normalizeJa(f.kana)),
    )
    .map((f) => f.word);
}

/** 맞추지 못한 일본어 구간에 읽는 법으로 찾은 낱말 칩을 더한다 */
function addKanaWords(
  segments: RepairSegment[],
  cards: Record<string, CueCard>,
  words: CueWord[],
): void {
  segments.forEach((seg, i) => {
    const card: CueCard | undefined = cards[String(i)];
    if (seg.lang !== "ja" || leads(card)) return;
    const found = kanaWords(seg.text, words).filter(
      (w) => !card?.words.some((c) => c.ja === w.ja),
    );
    if (found.length === 0) return;
    cards[String(i)] = card
      ? { ...card, words: [...card.words, ...found] }
      : { sentences: [], whole: false, words: found };
  });
}

/** ③ 맞추지 못한 "일본어 → 한국어 → 일본어" 되풀이는 나은 받아쓰기를 두 줄 모두에 보인다 */
function unifyRepeats(
  segments: RepairSegment[],
  cards: Record<string, CueCard>,
  toKana: (t: string) => string,
): void {
  for (let i = 0; i + 2 < segments.length; i++) {
    const [a, k, b] = [segments[i], segments[i + 1], segments[i + 2]];
    if (a.lang !== "ja" || k.lang !== "ko" || b.lang !== "ja") continue;
    if (leads(cards[String(i)]) || leads(cards[String(i + 2)])) continue;
    const pa = kanaPhones(toKana(a.text));
    const pb = kanaPhones(toKana(b.text));
    if (Math.max(pa.length, pb.length) < MIN_PHONES) continue;
    if (phoneSimilarity(pa, pb) < PAIR_SIMILARITY) continue;
    const better = betterTranscription(a.text.trim(), b.text.trim());
    const worse = better === a.text.trim() ? i + 2 : i;
    const card = cards[String(worse)];
    cards[String(worse)] = card
      ? { ...card, text: better }
      : { sentences: [], whole: false, words: [], text: better };
  }
}

/**
 * 맞춘 카드(buildCards의 결과)를 맥락과 소리로 보탠 새 카드 묶음.
 * words는 이 강·과에서 익히는 낱말(한글 소리·가나 읽기로 찾는다).
 */
export function repairCards(
  segments: RepairSegment[],
  cards: Record<string, CueCard>,
  words: CueWord[],
  toKana: (t: string) => string,
): Record<string, CueCard> {
  const out = { ...cards };
  // 이 자막의 일본어 구간에서 이미 찾은 낱말도 이 강의에서 다루는 낱말이다
  const focus = [...words, ...Object.values(cards).flatMap((c) => c.words)];
  fillFromNeighbors(segments, out, toKana);
  fillHangul(segments, out, focus);
  addKanaWords(segments, out, focus);
  unifyRepeats(segments, out, toKana);
  return out;
}
