import { hasKanji } from "@/lib/ilmuta/ruby";
import type { CueCard, CueSentence, CueWord } from "./cards";
import type { ConjugatedForm } from "./conjugations";
import { normalizeJa } from "./match";
import { kanaPhones, phoneSimilarity } from "./phonetic";
import { wordSentence } from "./repair";

// 소책자 문장과 맞추지 못한 짧은 일본어 줄을, 문장 대신 정해진 재료로 알아본다. 화면을 모르는 순수 함수다.
// ① 맞장구·대답(うん·ううん·はい…): 정해 둔 뜻으로. うん과 ううん은 whisper가 자주 뒤바꾸므로 바로 뒤
//    한국어 줄(강사가 옮긴 뜻)이 「아니」로 시작하면 ううん, 「응」으로 시작하면 うん으로 본다.
// ② 그 강의 문형 틀(「うん、～の。」)에 그 강 낱말·등장인물 이름을 채운 꼴: 틀의 가나는 그대로 맞아야 하고,
//    빈칸의 글은 낱말 읽기와 소리가 닮아야 한다(받아 적기가 이름을 틀리게 적는다).
// ③ 드릴 낱말의 활용형(食べさせられる): 활용 엔진이 만든 꼴과 읽기가 똑같을 때만.
// 맞춘 글은 받아 적은 글이 아니라 정해 둔 재료로 만든 글이다. ②는 강사가 실제로 한 말과 다를 수 있어
// 출처를 transcript로 두어 화면이 "교재와 다를 수 있음"을 붙이게 한다.

export interface FixedSegment {
  text: string;
  lang: "ko" | "ja";
  start?: number;
}

/** 맞장구·대답과 그 뜻 */
const ANSWER_KO: Record<string, string> = {
  あ: "아",
  ああ: "아",
  うん: "응",
  ううん: "아니",
  はい: "네",
  いいえ: "아니요",
  ええ: "네",
  いや: "아니",
  そう: "그래",
  そうです: "그렇습니다",
  そうですね: "그렇네요",
  そうだね: "그렇네",
  ありがとう: "고마워",
  ありがとうございます: "감사합니다",
  すみません: "죄송합니다",
};

/** 문장 끝에 붙는 군말(よ·ね) — 활용형을 견줄 때 떼고 본다 */
const TAIL = /(?:よね|よ|ね|か)$/u;

/** 뒤(없으면 앞) 가까운 한국어 줄. 이웃으로 볼 거리는 두 구간·8초 */
function nearKorean(segments: FixedSegment[], i: number): string | null {
  for (const j of [i + 1, i + 2, i - 1]) {
    const s = segments[j];
    if (s?.lang !== "ko") continue;
    const a = segments[i].start;
    if (a !== undefined && s.start !== undefined && Math.abs(s.start - a) > 8)
      continue;
    return s.text.trim();
  }
  return null;
}

/**
 * 대답 하나로 된 줄(또는 그 줄의 마디 text)의 대답. うん 무리는 이웃 한국어 줄로 가른다.
 */
export function answerOf(
  segments: FixedSegment[],
  i: number,
  text: string = segments[i].text,
): { ja: string; ko: string } | null {
  const plain = normalizeJa(text).replace(/ー/gu, "");
  const unLike = /^(?:う?うん|ん|んうん|うんうん)$/u.test(plain);
  if (unLike) {
    const ko = nearKorean(segments, i);
    if (ko && /^아니/u.test(ko)) return { ja: "ううん", ko: ANSWER_KO.ううん };
    if (ko && /^응/u.test(ko)) return { ja: "うん", ko: ANSWER_KO.うん };
    // 이웃이 말해 주지 않으면 받아 적은 그대로(ん 하나는 무엇인지 몰라 두지 않는다)
    if (plain === "うん" || plain === "ううん")
      return { ja: plain, ko: ANSWER_KO[plain] };
    return null;
  }
  const ko = ANSWER_KO[plain];
  return ko ? { ja: plain, ko } : null;
}

function plainSentence(ja: string, ko: string): CueSentence {
  return { ja, ko, ruby: [{ text: ja }] };
}

/** 문형 틀 하나(일본어·한국어). ～·~ 자리에 낱말이 들어간다 */
export interface Frame {
  ja: string;
  ko: string;
}

/** 틀을 쉼표·「／」에서 나눈 마디 짝(일본어·한국어 마디 수가 같을 때만 짝짓는다) */
export function frameClauses(frames: Frame[]): Frame[] {
  const out: Frame[] = [];
  const seen = new Set<string>();
  const push = (f: Frame) => {
    const key = f.ja.trim();
    if (key === "" || seen.has(key)) return;
    seen.add(key);
    out.push({ ja: f.ja.trim(), ko: f.ko.trim() });
  };
  for (const frame of frames) {
    const jas = frame.ja.split(/[／/]/u);
    const kos = frame.ko.split(/[／/]/u);
    jas.forEach((ja, k) => {
      const ko = kos.length === jas.length ? kos[k] : "";
      push({ ja, ko });
      const jaParts = ja.split(/[、,]/u).filter((p) => p.trim() !== "");
      const koParts = ko.split(/[,，、]/u).filter((p) => p.trim() !== "");
      if (jaParts.length > 1)
        jaParts.forEach((p, n) => {
          push({
            ja: p,
            ko: koParts.length === jaParts.length ? koParts[n] : "",
          });
        });
    });
  }
  return out;
}

/** 빈칸을 채울 낱말과 그 비교용 소리 */
interface Filler {
  word: CueWord;
  kana: string;
  phones: string;
}

/**
 * 빈칸 글이 낱말로 볼 만큼 닮았나: 가나가 같거나, 소리(자모열)가 같거나,
 * 자모 5개 이상 낱말이면 소리가 0.75 넘게 닮음(恵み/恵: めぐみみ·めぐみ)
 */
function fillerFor(slotKana: string, fillers: Filler[]): Filler | null {
  const phones = kanaPhones(slotKana);
  let best: Filler | null = null;
  let bestScore = 0;
  for (const f of fillers) {
    // 가나가 같거나, 장음 표기만 다르고 소리가 같은 것(サンウー/サンウ)
    if (f.kana === slotKana || (phones.length >= 3 && phones === f.phones))
      return f;
    if (f.phones.length < 5 || phones.length < 4) continue;
    const score = phoneSimilarity(phones, f.phones);
    if (score >= 0.75 && score > bestScore) {
      best = f;
      bestScore = score;
    }
  }
  return best;
}

/** 틀 일본어를 고정 조각(비교용 가나)과 빈칸으로 */
function frameParts(ja: string, toKana: (t: string) => string): string[] {
  return ja.split(/[～~]/u).map((p) => normalizeJa(toKana(p)));
}

/**
 * 낱말을 채워 쓸 틀인가. 빈칸 뒤 고정 조각이 명사 뒤에 오는 조사·말(の·は·じゃない·です…)로 시작해야 한다.
 * 동사 틀(～なかった·～ます)의 빈칸은 낱말이 아니라 활용 줄기라 채우면 틀린 글이 된다.
 * 고정 조각이 하나도 없는 틀(「～。」)은 줄 전체가 낱말 하나인 것과 같아 맡지 않는다(소리만 같은 다른 낱말이 걸린다).
 */
function usableFrame(parts: string[]): boolean {
  if (parts.length < 2 || parts.every((p) => p === "")) return false;
  return parts
    .slice(1)
    .every((p) => p === "" || /^[のはがをにもとじでだかやへ]/u.test(p));
}

/** 줄(비교용 가나)이 고정 조각·빈칸 차례에 맞으면 빈칸마다 채운 낱말 */
function fitFrame(
  line: string,
  parts: string[],
  fillers: Filler[],
): Filler[] | null {
  const [head, ...rest] = parts;
  if (!line.startsWith(head)) return null;
  const body = line.slice(head.length);
  if (rest.length === 0) return body === "" ? [] : null;
  const [next, ...more] = rest;
  // 빈칸 다음 고정 조각이 나오는 자리마다 나눠 본다
  for (let cut = 1; cut <= body.length; cut++) {
    const slot = body.slice(0, cut);
    if (!body.slice(cut).startsWith(next)) continue;
    const f = fillerFor(slot, fillers);
    if (!f) continue;
    const tail = fitFrame(body.slice(cut), [next, ...more], fillers);
    if (tail) return [f, ...tail];
  }
  return null;
}

function fillTemplate(text: string, values: string[], mark: RegExp): string {
  let k = 0;
  return text.replace(mark, () => values[k++] ?? "");
}

function hasBatchim(syllable: string): boolean {
  const code = syllable.charCodeAt(0) - 0xac00;
  return code >= 0 && code <= 11171 && code % 28 !== 0;
}

/** 받침 있는 말 뒤에서 바뀌는 조사(틀의 한국어는 받침 없는 말 뒤 꼴로 적혀 있다: ~가·~는·~야) */
const AFTER_BATCHIM: [RegExp, string][] = [
  [/^가(?![가-힣])/u, "이"],
  [/^는/u, "은"],
  [/^야/u, "이야"],
  [/^를/u, "을"],
  [/^와(?![가-힣])/u, "과"],
];

/** 틀 한국어의 ~ 자리에 뜻을 넣고, 넣은 말의 받침에 맞게 바로 뒤 조사를 고친다 */
function fillKorean(template: string, values: string[]): string {
  const pieces = template.split(/[～~]/u);
  let out = pieces[0];
  for (let k = 1; k < pieces.length; k++) {
    const value = values[k - 1] ?? "";
    let rest = pieces[k];
    if (hasBatchim(value.slice(-1)))
      for (const [re, to] of AFTER_BATCHIM)
        if (re.test(rest)) {
          rest = rest.replace(re, to);
          break;
        }
    out += value + rest;
  }
  return out;
}

/** 틀에 낱말을 채운 문장 */
function frameSentence(frame: Frame, picks: Filler[]): CueSentence {
  const ja = fillTemplate(
    frame.ja,
    picks.map((p) => p.word.ja),
    /[～~]/gu,
  );
  const ko = frame.ko
    ? fillKorean(
        frame.ko,
        picks.map((p) => p.word.ko.split(/[,，(（]/u)[0].trim()),
      )
    : "";
  const ruby: CueSentence["ruby"] = [];
  const pieces = frame.ja.split(/[～~]/u);
  pieces.forEach((piece, n) => {
    if (piece !== "") ruby.push({ text: piece });
    const w = picks[n]?.word;
    if (!w) return;
    ruby.push(...wordSentence(w).ruby);
  });
  return { ja, ko, ruby };
}

function fillersOf(words: CueWord[], toKana: (t: string) => string): Filler[] {
  const out: Filler[] = [];
  const seen = new Set<string>();
  for (const word of words) {
    if (seen.has(word.ja)) continue;
    seen.add(word.ja);
    const kana = normalizeJa(word.reading ?? toKana(word.ja));
    if (kana === "" || hasKanji(kana)) continue;
    out.push({ word, kana, phones: kanaPhones(kana) });
  }
  return out;
}

/** 활용형 줄: 읽기(또는 표기)가 활용형과 똑같으면 그 꼴들. 가나 세 글자 미만은 보지 않는다 */
function conjugationsOf(
  text: string,
  forms: ConjugatedForm[],
  toKana: (t: string) => string,
): ConjugatedForm[] {
  const plain = normalizeJa(text);
  const bare = plain.replace(TAIL, "");
  const kana = normalizeJa(toKana(text)).replace(TAIL, "");
  return forms.filter((f) => {
    const kanji = normalizeJa(f.kanji);
    if (kanji === plain || kanji === bare) return hasKanji(f.kanji);
    const reading = normalizeJa(f.reading);
    return [...reading].length >= 3 && (reading === kana || reading === bare);
  });
}

export interface FixedSource {
  /** 그 강의 문형 틀 */
  frames?: Frame[];
  /** 틀 빈칸에 넣을 낱말(그 강 낱말·이름) */
  fillers?: CueWord[];
  /** 드릴 활용형 표 */
  conjugations?: ConjugatedForm[];
  /**
   * 그 과에서 배우는 활용 기술 열쇠(curriculum.ts). 있으면 그 기술의 꼴만 알아본다
   * (강사는 그 과의 꼴을 말하므로, 다른 꼴과 읽기가 같으면 잘린 받아쓰기일 수 있다).
   */
  lessonSkills?: Set<string>;
}

/**
 * 활용형 줄의 카드: 사전형 낱말 칩과 「뜻 · 활용형 이름(꼴의 뜻)」.
 * 그 과 기술로 좁힌 뒤에도 표기가 다른 꼴(来ません/着ません)이 남으면 고르지 않는다(null).
 */
function conjugationCard(
  matches: ConjugatedForm[],
  lessonSkills?: Set<string>,
): CueCard | null {
  const picked =
    lessonSkills && lessonSkills.size > 0
      ? matches.filter((m) => lessonSkills.has(m.skill))
      : matches;
  if (picked.length === 0) return null;
  if (new Set(picked.map((m) => m.kanji)).size > 1) return null;
  const first = picked[0];
  const labels = [...new Set(picked.map((m) => m.label))];
  const ko = `${first.ko} · ${labels.join("/")}(${first.formKo})`;
  const word: CueWord =
    first.dictReading !== first.dict
      ? { ja: first.dict, reading: first.dictReading, ko: first.ko }
      : { ja: first.dict, ko: first.ko };
  const ruby = wordSentence({
    ja: first.kanji,
    reading: first.reading,
    ko,
  }).ruby;
  return {
    sentences: [{ ja: first.kanji, ko, ruby }],
    whole: true,
    words: first.kanji === first.dict ? [] : [word],
    inferred: true,
  };
}

/**
 * 맞추지 못한 일본어 줄에 ①②③ 순서로 카드를 붙인 새 카드 묶음(이미 문장을 통째 맞춘 줄은 그대로).
 */
export function fixedCards(
  segments: FixedSegment[],
  cards: Record<string, CueCard>,
  source: FixedSource,
  toKana: (t: string) => string,
): Record<string, CueCard> {
  const out = { ...cards };
  const clauses = frameClauses(source.frames ?? []).map((f) => ({
    frame: f,
    parts: frameParts(f.ja, toKana),
  }));
  const fillers = fillersOf(source.fillers ?? [], toKana);
  /** 글 조각 하나를 ①② 순서로 알아본 카드 */
  const pieceCard = (text: string, i: number): CueCard | null => {
    const answer = answerOf(segments, i, text);
    if (answer)
      return {
        sentences: [plainSentence(answer.ja, answer.ko)],
        whole: true,
        words: [],
        inferred: true,
      };
    const line = normalizeJa(toKana(text));
    if (fillers.length > 0)
      for (const { frame, parts } of clauses) {
        if (!usableFrame(parts)) continue;
        const picks = fitFrame(line, parts, fillers);
        if (!picks) continue;
        return {
          origin: "transcript",
          sentences: [frameSentence(frame, picks)],
          whole: true,
          words: picks.map((p) => p.word),
          inferred: true,
        };
      }
    return null;
  };
  segments.forEach((seg, i) => {
    if (seg.lang !== "ja") return;
    const card = out[String(i)];
    if (card?.whole && card.sentences.length > 0) return;
    const whole = pieceCard(seg.text, i);
    if (whole) {
      out[String(i)] = whole;
      return;
    }
    // 「あ、～の」처럼 쉼표로 이은 줄은 마디마다 알아보고, 모두 알아보면 이어 붙인다
    const pieces = seg.text.split(/[、,，]/u).filter((p) => normalizeJa(p));
    if (pieces.length > 1) {
      const found = pieces.map((p) => pieceCard(p, i));
      if (found.every((c): c is CueCard => c !== null)) {
        out[String(i)] = {
          ...(found.some((c) => c.origin) ? { origin: "transcript" } : {}),
          sentences: found.flatMap((c) => c.sentences),
          whole: true,
          words: found.flatMap((c) => c.words),
          inferred: true,
        };
        return;
      }
    }
    if (source.conjugations) {
      const matches = conjugationsOf(seg.text, source.conjugations, toKana);
      const made =
        matches.length > 0
          ? conjugationCard(matches, source.lessonSkills)
          : null;
      if (made) out[String(i)] = made;
    }
  });
  return out;
}
