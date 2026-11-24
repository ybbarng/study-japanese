import {
  type Glossary,
  hasKanji,
  type RubySegment,
  rubySegments,
  splitOkurigana,
} from "@/lib/ilmuta/ruby";
import { pictureOf } from "@/lib/pictures";
import type { Sentence } from "@/lib/textbook/schema";
import { alignInOrder, undoubled } from "./align";
import type { CueCard, CueOrigin, CueWord } from "./card-schema";
import { type FixedSource, fixedCards } from "./fixed-cards";
import {
  bestCandidate,
  type MatchCandidate,
  matchSegment,
  normalizeJa,
  type PieceMatch,
  splitSentences,
} from "./match";
import { rubyFromReading } from "./reading-ruby";
import { type RepairSegment, repairCards, wordSentence } from "./repair";
import {
  counterFitsAt,
  inflectedFitsAt,
  kanjiCompounds,
  verifiedRubySegments,
  wordFitsAt,
} from "./word-bounds";

// 자막의 일본어 구간마다 붙일 "맥락 카드": 맞춘 소책자 문장(정확한 글·읽는 법·뜻)과 구간 속 낱말.
// 서버가 자막을 내줄 때 만들어 붙인다(화면은 소책자 전체를 받지 않아도 된다).
// 카드의 꼴은 card-schema.ts에 있다(재생 화면이 이 파일의 그림 표·맞추기 코드를 받지 않게).

export {
  type CueCard,
  type CueOrigin,
  type CueSentence,
  type CueWord,
  cueCardSchema,
  cueOriginSchema,
  cueSentenceSchema,
  cueWordSchema,
} from "./card-schema";

/**
 * 낱말의 다른 꼴(활용한 꼴): 받아 적은 글에 form이 나오면 word(사전형) 칩을 단다.
 * 활용 엔진이 만든 꼴만 쓴다(conjugations.ts). 받아 적은 글을 엄격하게 볼 때만 찾는다
 */
export interface InflectedWord {
  form: string;
  word: CueWord;
}

/** 카드를 만들 재료 */
export interface CardSource {
  /** 맞출 문장(소책자 문장, 또는 자막에서 받아 적은 짝) */
  sentences: Sentence[];
  /** 문장 출처. 없으면 소책자 */
  origin?: CueOrigin;
  /** 한자 낱말 → 읽는 법(문장에 후리가나를 단다) */
  glossary: Glossary;
  /** 낱말 카드로 띄울 낱말 */
  words: CueWord[];
  /** 이 강·과에서 익히는 낱말. 한글 소리나 가나로 적힌 곳을 찾는다(repair.ts). 없으면 찾지 않는다 */
  focus?: CueWord[];
  /** 예문 mp3가 소책자 문장을 읽는 차례. 있으면 차례로 한 번 더 맞춘다(align.ts) */
  ordered?: Sentence[];
  /** 맞추지 못한 짧은 줄을 알아볼 정해진 재료(대답·문형 틀·활용형, fixed-cards.ts) */
  fixed?: FixedSource;
  /** 받아 적은 글에서 찾을 낱말의 활용한 꼴 */
  inflected?: InflectedWord[];
  /** 받아 적은 글에서만 더 찾을 낱말(사전 색인). words에 같은 표기가 있으면 words가 먼저다 */
  heardOnlyWords?: CueWord[];
  /** 소책자에 원문이 없는 오디오인가(맞추지 못한 일본어 줄에 noBookText를 단다) */
  noBookText?: boolean;
}

/** 한 구간에 보일 낱말은 이만큼까지 */
const MAX_WORDS = 6;

/** 문장의 읽는 법. 받아 적은 글(transcript)이면 자리가 확인된 낱말에만 단다(word-bounds.ts) */
function rubyOf(s: Sentence, source: CardSource): RubySegment[] {
  if (s.reading && s.reading !== s.ja && hasKanji(s.ja))
    return splitOkurigana(s.ja, s.reading);
  return source.origin === "transcript"
    ? verifiedRubySegments(s.ja, source.glossary)
    : rubySegments(s.ja, source.glossary);
}

/** 문장 글 속 낱말. 받아 적은 글로 만든 카드면 낱말 칩도 자리가 확인된 것만(활용한 꼴까지) */
function wordsIn(text: string, source: CardSource): CueWord[] {
  return source.origin === "transcript"
    ? heardWords(text, source)
    : findWords(text, source.words, MAX_WORDS);
}

/** 받아 적은 자막 글 속 낱말: 출처와 상관없이 늘 자리가 확인된 것만, 활용한 꼴까지 찾는다 */
function heardWords(text: string, source: CardSource): CueWord[] {
  return findWords(
    text,
    heardVocabulary(source),
    MAX_WORDS,
    true,
    source.inflected,
  );
}

const heardCache = new WeakMap<CardSource, CueWord[]>();

/** 받아 적은 글에서 찾을 낱말: words에 사전 색인 낱말을 겹치지 않게 보탠다(재료마다 한 번) */
function heardVocabulary(source: CardSource): CueWord[] {
  if (!source.heardOnlyWords?.length) return source.words;
  const hit = heardCache.get(source);
  if (hit) return hit;
  const have = new Set(source.words.map((w) => w.ja));
  const out = [
    ...source.words,
    ...source.heardOnlyWords.filter((w) => !have.has(w.ja)),
  ];
  heardCache.set(source, out);
  return out;
}

/** 두 낱말 목록을 겹치지 않게 잇는다(MAX_WORDS까지) */
function joinWords(a: CueWord[], b: CueWord[]): CueWord[] {
  const out = [...a];
  for (const w of b) if (!out.some((x) => x.ja === w.ja)) out.push(w);
  return out.slice(0, MAX_WORDS);
}

/** 문장 꼴로 볼 만한 받아쓰기의 최소 글자 수(부호 빼고). 짧은 소리(さあ·イル)는 잡음이 많다 */
const MIN_HEARD_SENTENCE = 6;

/**
 * 원문이 없는 오디오의 맞추지 못한 일본어 줄을 "받아 적은 글"로 보일 만한가:
 * 자리가 확인된 낱말이 있거나, 히라가나가 든 충분히 긴 문장 꼴이다.
 */
export function heardLineWorthShowing(text: string, words: CueWord[]) {
  if (words.length > 0) return true;
  const plain = normalizeJa(text);
  return [...plain].length >= MIN_HEARD_SENTENCE && /[ぁ-ゖ]/u.test(text);
}

/** 한자 낱말을 읽는 법으로 푼 글(비교용) */
export function kanaOf(text: string, glossary: Glossary): string {
  return rubySegments(text, glossary)
    .map((s) => s.reading ?? s.text)
    .join("");
}

/** 같은 글의 문장은 하나만 남긴다(회화 Basic·Advanced에 같은 문장이 두 번 나온다) */
function uniqueSentences(sentences: Sentence[]): Sentence[] {
  const seen = new Set<string>();
  return sentences.filter((s) => {
    const key = normalizeJa(s.ja);
    if (key === "" || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** 소책자 항목 안 문장 조각을 따로 비교할 때 조각의 최소 길이(짧은 맞장구는 여러 항목에 걸린다) */
const MIN_PART_LENGTH = 6;

/**
 * 소책자 항목 하나의 비교용 글들: 통째(한자 표기·가나 표기), 그리고 한 항목에 문장이 여럿이면
 * 충분히 긴 문장 조각마다. 강의는 항목 속 한 문장만 읽기도 한다.
 */
export function candidateForms(
  s: Sentence,
  toKana: (text: string) => string,
): string[] {
  const forms = [normalizeJa(s.ja), normalizeJa(s.reading ?? toKana(s.ja))];
  const parts = splitSentences(s.ja);
  if (parts.length > 1)
    for (const p of parts) {
      const plain = normalizeJa(p);
      if ([...plain].length < MIN_PART_LENGTH) continue;
      forms.push(plain, normalizeJa(toKana(p)));
    }
  return [...new Set(forms.filter((f) => f !== ""))];
}

/** 낱말 카드에 띄울 만한 낱말: 한자가 있거나 가나 세 글자 이상(짧은 가나는 문장 속에서 잘못 걸린다) */
function wordWorthShowing(w: CueWord): boolean {
  return hasKanji(w.ja) || [...w.ja].length >= 3;
}

/**
 * 글 속에서 앞에서부터 가장 긴 낱말을 찾는다(겹치는 짧은 낱말은 건너뛴다).
 * strict면 자리가 확인된 낱말만(word-bounds.ts: 이름·합성어·외래어의 일부, 다른 낱말의 어간은 뺀다).
 * inflected는 strict일 때만 보는 활용한 꼴(한자가 든 두 글자 이상만: 가나만인 꼴은 다른 말과 겹친다).
 * 활용한 꼴이 나오면 그 사전형 칩을 단다(食べました → 食べる).
 */
export function findWords(
  text: string,
  words: CueWord[],
  max: number = MAX_WORDS,
  strict = false,
  inflected: InflectedWord[] = [],
): CueWord[] {
  const forms: InflectedWord[] = [
    ...words.filter(wordWorthShowing).map((w) => ({ form: w.ja, word: w })),
    ...(strict
      ? inflected.filter((f) => hasKanji(f.form) && [...f.form].length >= 2)
      : []),
  ];
  const byFirst = new Map<string, InflectedWord[]>();
  for (const f of forms) {
    const list = byFirst.get(f.form[0]) ?? [];
    list.push(f);
    byFirst.set(f.form[0], list);
  }
  for (const list of byFirst.values())
    list.sort((a, b) => b.form.length - a.form.length);
  const compounds = strict ? kanjiCompounds(words.map((w) => w.ja)) : undefined;
  const out: CueWord[] = [];
  const seen = new Set<string>();
  let i = 0;
  while (i < text.length && out.length < max) {
    const hit = byFirst
      .get(text[i])
      ?.find(
        (f) =>
          text.startsWith(f.form, i) &&
          (!strict ||
            (wordFitsAt(text, i, f.form, compounds) &&
              counterFitsAt(text, i, f.form, f.word.ko) &&
              (f.form === f.word.ja || inflectedFitsAt(text, i, f.form)))),
      );
    if (hit) {
      if (!seen.has(hit.word.ja)) out.push(hit.word);
      seen.add(hit.word.ja);
      i += hit.form.length;
    } else i++;
  }
  return out;
}

/** 그림이 있는 낱말이면 붙인다(그린 그림 → 그림 문자) */
function withPicture(w: CueWord): CueWord {
  const p = pictureOf(w.ja);
  if (!p) return w;
  return p.kind === "svg" ? { ...w, picture: p.id } : { ...w, emoji: p.emoji };
}

/**
 * 자막 구간마다 카드를 만든다. 열쇠는 원래 segments의 차례(문자열).
 * 일본어 구간을 소책자 문장과 맞춘 뒤, 맞추지 못한 곳은 앞뒤 맥락과 소리로 한 번 더 살핀다(repair.ts).
 * 맞춘 문장도 낱말도 없으면 카드를 두지 않는다(화면은 자막만 보인다).
 */
export function buildCards(
  segments: RepairSegment[],
  source: CardSource,
): Record<string, CueCard> {
  const toKana = (t: string) => kanaOf(t, source.glossary);
  const direct = matchCards(segments, source);
  const matched = source.ordered
    ? alignInOrder(segments, direct, source.ordered, toKana, (sentences) =>
        sentenceCard(sentences, source),
      )
    : direct;
  // 한글 소리로 찾는 낱말은 낱말 목록(words)에 든 것만(사전 색인 낱말은 받아 적은 글의 칩에만 쓴다)
  const repaired = source.focus
    ? repairCards(
        segments,
        matched,
        source.focus,
        toKana,
        new Set(source.words.map((w) => w.ja)),
      )
    : matched;
  const cards = fixedCards(
    segments,
    repaired,
    source.fixed ?? {},
    toKana,
    (s) => sentenceCard([s], source),
  );
  if (source.noBookText) markHeardLines(segments, cards);
  // 앞뒤 맥락으로 찾은 카드의 낱말까지 그림을 붙인다
  return Object.fromEntries(
    Object.entries(cards).map(([k, c]) => [
      k,
      c.words.length ? { ...c, words: c.words.map(withPicture) } : c,
    ]),
  );
}

/**
 * 원문이 없는 오디오: 문장 카드가 끝내 붙지 않은 일본어 줄 가운데 일본어로 볼 만한 줄에
 * noBookText를 단다(heardLineWorthShowing). 맥락·소리로 찾은 단계까지 다 거친 뒤에 본다
 */
function markHeardLines(
  segments: RepairSegment[],
  cards: Record<string, CueCard>,
): void {
  segments.forEach((seg, i) => {
    if (seg.lang !== "ja" || seg.text.trim() === "") return;
    const card: CueCard | undefined = cards[String(i)];
    if (card?.sentences.length) return;
    if (!heardLineWorthShowing(card?.text ?? seg.text, card?.words ?? []))
      return;
    cards[String(i)] = card
      ? { ...card, noBookText: true }
      : { sentences: [], whole: false, words: [], noBookText: true };
  });
}

/**
 * 줄 전체가 아는 낱말 하나(부호·な 꼬리는 무시)인지 묻는 함수. 낱말 표는 한 번만 만든다.
 * 낱말 둘 이상이 든 줄(あの人は誰)은 조사가 사라지지 않게 받아쓰기에 낱말 칩만 단다(matchCards).
 * 한자 낱말의 읽는 법(가나)으로 적힌 줄은 가나 세 글자 이상이거나 이 강·과에서 익히는 낱말일 때만 본다
 * (두 글자 가나는 같은 소리의 다른 낱말이 많다).
 */
export function wordLineMatcher(
  words: CueWord[],
  focus: CueWord[] = [],
): (text: string) => CueWord | null {
  const focusJa = new Set(focus.map((w) => w.ja));
  // 표기(한자 낱말은 한자 표기, 가나 낱말은 두 글자 이상)와, 한자 낱말의 읽는 법
  const forms = new Map<string, CueWord>();
  const readings = new Map<string, CueWord>();
  for (const w of words) {
    const ja = normalizeJa(w.ja.replace(/[～~]/g, ""));
    if (ja !== "" && (hasKanji(w.ja) || [...ja].length >= 2) && !forms.has(ja))
      forms.set(ja, w);
    const reading = w.reading ? normalizeJa(w.reading) : "";
    if (reading !== "" && reading !== ja && !readings.has(reading))
      readings.set(reading, w);
  }
  return (text) => {
    const plain = undoubled(normalizeJa(text));
    if (plain === "") return null;
    const byForm = forms.get(plain);
    if (byForm) return byForm;
    const byReading = readings.get(plain);
    if (!byReading) return null;
    // 읽는 법은 세 글자 이상. 이 강·과에서 익히는 낱말이면 두 글자부터 보되, 가타카나로 적힌 줄
    // (アメ: 雨일 수도 飴일 수도)과 문법 낱말과 소리가 같은 것(なら)은 두 글자로 보지 않는다
    const n = [...plain].length;
    const twoOk =
      n === 2 &&
      focusJa.has(byReading.ja) &&
      !/[ァ-ヺ]/u.test(text) &&
      !GRAMMAR_KANA.has(plain);
    return n >= 3 || twoOk ? byReading : null;
  };
}

/** 두 글자 읽는 법이 같은 문법 낱말(조건·조사 등) */
const GRAMMAR_KANA = new Set(["なら", "から", "まで", "だけ", "ので", "のに"]);

/** 고른 소책자 문장으로 만든 카드(구간 전체를 맞춘 것으로 본다) */
function sentenceCard(sentences: Sentence[], source: CardSource): CueCard {
  const own = new Set(sentences.map((s) => s.ja));
  return {
    ...(source.origin === "transcript"
      ? { origin: "transcript" as const }
      : {}),
    sentences: sentences.map((s) => ({
      ja: s.ja,
      ko: s.ko,
      ruby: rubyOf(s, source),
    })),
    whole: true,
    words: wordsIn(sentences.map((s) => s.ja).join("　"), source).filter(
      (w) => !own.has(w.ja),
    ),
  };
}

/**
 * 교정 파일로 올린 줄의 카드(review.ts): 고친 글을 문장으로, 교정 파일의 읽는 법·뜻을 단다.
 * 받아 적은 글이므로 낱말 칩은 자리가 확인된 것만 찾는다(word-bounds.ts)
 */
export function reviewedCard(
  text: string,
  reading: string | null | undefined,
  ko: string,
  source: CardSource,
): CueCard {
  return {
    origin: "transcript",
    reviewed: true,
    sentences: [
      { ja: text, ko, ruby: rubyFromReading(text, reading, source.glossary) },
    ],
    whole: true,
    words: heardWords(text, source)
      .filter((w) => w.ja !== text)
      .map(withPicture),
  };
}

/** 줄 통째를 한 후보와 맞춘 결과(조각 하나짜리). 못 맞추면 null */
function wholeLineMatch(
  text: string,
  candidates: MatchCandidate[],
  toKana: (t: string) => string,
): PieceMatch[] | null {
  const forms = [...new Set([normalizeJa(text), normalizeJa(toKana(text))])];
  const hit = bestCandidate(forms, candidates);
  return hit.index >= 0 ? [{ piece: text, ...hit }] : null;
}

function matchCards(
  segments: RepairSegment[],
  source: CardSource,
): Record<string, CueCard> {
  const sentences = uniqueSentences(source.sentences);
  const toKana = (t: string) => kanaOf(t, source.glossary);
  const candidates: MatchCandidate[] = sentences.map((s) => ({
    forms: candidateForms(s, toKana),
  }));
  const out: Record<string, CueCard> = {};
  const lineWordOf = wordLineMatcher(source.words, source.focus);
  segments.forEach((seg, i) => {
    if (seg.lang !== "ja" || seg.text.trim() === "") return;
    // 같은 말을 한 줄에 두 번 받아 적었으면 한 번만 견준다
    const once = undoubled(normalizeJa(seg.text));
    const text = once === normalizeJa(seg.text) ? seg.text : once;
    const split = matchSegment(text, candidates, toKana);
    // 짧은 문장이 붙은 줄(ええ。…)은 조각으로 나누면 짧은 조각을 못 맞추니 줄 통째로도 견준다
    const pieces =
      split.length > 1 && split.some((p) => p.index < 0)
        ? (wholeLineMatch(text, candidates, toKana) ?? split)
        : split;
    if (!pieces.every((p) => p.index >= 0) || pieces.length === 0) {
      // 줄 전체가 아는 낱말 하나면 낱말 카드로(받아쓰기 대신 교재 낱말의 표기·읽는 법·뜻)
      const lineWord = lineWordOf(seg.text);
      if (lineWord) {
        out[String(i)] = {
          sentences: [wordSentence(lineWord)],
          whole: true,
          words: [],
        };
        return;
      }
    }
    const matched: Sentence[] = [];
    for (const p of pieces) {
      const s = p.index >= 0 ? sentences[p.index] : null;
      if (s && !matched.includes(s)) matched.push(s);
    }
    const whole = pieces.length > 0 && pieces.every((p) => p.index >= 0);
    // 낱말은 정확한 소책자 글에서 찾는다. 맞추지 못한 조각은 받아 적은 자막 글이라 자리가 확인된 것만
    const heardText = [
      ...pieces.filter((p) => p.index < 0).map((p) => p.piece),
      ...(pieces.length === 0 ? [seg.text] : []),
    ].join("　");
    // 문장이 곧 그 낱말이면(단어 코너) 낱말 칸에 다시 두지 않는다
    const own = new Set(matched.map((s) => s.ja));
    const words = joinWords(
      wordsIn(matched.map((s) => s.ja).join("　"), source),
      heardText === "" ? [] : heardWords(heardText, source),
    ).filter((w) => !own.has(w.ja));
    if (matched.length === 0 && words.length === 0) return;
    out[String(i)] = {
      // 받아 적은 글로 만든 문장이면 화면이 "교재와 다를 수 있음"을 보이도록 표시한다
      ...(source.origin === "transcript" && matched.length > 0
        ? { origin: "transcript" as const }
        : {}),
      sentences: matched.map((s) => ({
        ja: s.ja,
        ko: s.ko,
        ruby: rubyOf(s, source),
      })),
      whole,
      words,
    };
  });
  return out;
}
