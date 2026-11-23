import type { PageRange, Pattern, Sentence } from "./schema";
import {
  hasHangul,
  isPageNumber,
  pdfLines,
  type Segment,
  splitSegments,
  stripKoreanDirections,
  tidyJa,
  tidyKo,
} from "./text-utils";

/**
 * 일무따 휴대용 소책자(`pdftotext -layout` 결과)를 강별로 읽는다.
 *
 * 강 하나의 모양:
 *   01                         ← 강 번호(줄 맨 앞, 두 자리)
 *        본책 020~025쪽
 *   彼氏。 / 반말 / 남자 친구야.  ← 강 제목
 *   1단계 : 기본 단어 익히기   예문 01-2.mp3   ← 단어(두 단, 왼쪽 단을 먼저 읽는다)
 *   2단계 : 기본 문형 익히기   예문 01-3.mp3   ← 문형 머리(번호 + ～) 아래 일본어·한국어 문장
 *   3단계 : 회화로 다지기      예문 01-4-1.mp3 ← 단어 / 회화(일본어 대사 뒤에 한국어 대사)
 */

export type IlmutaBookletLesson = {
  no: number;
  title: string;
  titleKo: string;
  subtitle?: string;
  register?: "casual" | "polite";
  pages?: PageRange;
  words: Sentence[];
  patterns: Pattern[];
  patternSentences: Sentence[];
  conversationWords: Sentence[];
  conversation: Sentence[];
  /** 읽다가 걸린 것(사람이 볼 것) */
  issues: string[];
};

const PAGES_RE = /본책\s*(\d+)\s*~\s*(\d+)\s*쪽/;
const WORDS_RE = /^\s*1단계\s*:/;
const PATTERNS_RE = /^\s*2단계\s*:/;
const CONVERSATION_RE = /^\s*3단계\s*:/;
const MP3_MARK_RE = /^\s*예문\s*[\dA-Z-]+\.mp3\s*$/;
const SPEAKER_RE = /^\s*([^\s:：。、][^:：。、]{0,18}?)\s*[:：]\s+(.*)$/;

function isSkippable(line: string): boolean {
  const t = line.trim();
  return t === "" || isPageNumber(t) || MP3_MARK_RE.test(line);
}

export function parseIlmutaBooklet(text: string): IlmutaBookletLesson[] {
  const lines = pdfLines(text);
  const starts: number[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (!/^\d{2}(\s|$)/.test(lines[i])) continue;
    const near = lines.slice(i, i + 8).some((l) => PAGES_RE.test(l));
    if (near) starts.push(i);
  }
  return starts.map((start, k) =>
    parseLesson(lines.slice(start, starts[k + 1] ?? lines.length)),
  );
}

function parseLesson(block: string[]): IlmutaBookletLesson {
  const no = Number(block[0].slice(0, 2));
  const issues: string[] = [];
  const wordsAt = block.findIndex((l) => WORDS_RE.test(l));
  const patternsAt = block.findIndex((l) => PATTERNS_RE.test(l));
  const conversationAt = block.findIndex((l) => CONVERSATION_RE.test(l));
  if (wordsAt < 0 || patternsAt < 0 || conversationAt < 0) {
    issues.push("단계 머리(1단계·2단계·3단계)를 다 찾지 못함");
  }

  const headerEnd = firstFound(
    [wordsAt, patternsAt, conversationAt],
    block.length,
  );
  const header = parseHeader([block[0].slice(2), ...block.slice(1, headerEnd)]);

  const words =
    wordsAt >= 0
      ? parseWordColumns(
          block.slice(
            wordsAt + 1,
            firstFound([patternsAt, conversationAt], block.length),
          ),
        )
      : [];
  const { patterns, sentences: patternSentences } =
    patternsAt >= 0
      ? parsePatterns(
          block.slice(
            patternsAt + 1,
            conversationAt >= 0 ? conversationAt : block.length,
          ),
        )
      : { patterns: [], sentences: [] };
  const conv =
    conversationAt >= 0
      ? parseConversationSection(block.slice(conversationAt + 1))
      : { words: [], sentences: [], issue: undefined };
  if (conv.issue) issues.push(conv.issue);

  return {
    no,
    ...header,
    words,
    patterns,
    patternSentences,
    conversationWords: conv.words,
    conversation: conv.sentences,
    issues,
  };
}

function firstFound(indexes: number[], fallback: number): number {
  const found = indexes.filter((i) => i >= 0);
  return found.length > 0 ? Math.min(...found) : fallback;
}

/**
 * 줄이 넘어가며 잘린 한국어 조각을 잇는다. 뒤 조각이 어미 조각(`니다`, `니까`, `까?`, `요.`)으로
 * 시작하면 낱말 가운데서 잘린 것으로 보고 붙여 쓴다(`있습니` + `까?`, `있거든` + `요.`).
 */
export function appendWrappedKo(acc: string, piece: string): string {
  const next = piece.trim();
  if (!acc) return next;
  return /^(니다|니까|까[?？]|요[.?!？])/.test(next)
    ? acc + next
    : `${acc} ${next}`;
}

export function joinWrappedKo(pieces: string[]): string {
  return pieces.reduce(appendWrappedKo, "");
}

/** 강 머리: 제목(일본어)·뜻(한국어)·반말/존댓말·본책 쪽수, 제목 위 부제(35~40강) */
export function parseHeader(lines: string[]): {
  title: string;
  titleKo: string;
  subtitle?: string;
  register?: "casual" | "polite";
  pages?: PageRange;
} {
  const ja: string[] = [];
  const ko: string[] = [];
  const subtitle: string[] = [];
  let register: "casual" | "polite" | undefined;
  let pages: PageRange | undefined;
  for (const line of lines) {
    for (const { text } of splitSegments(line)) {
      const m = text.match(PAGES_RE);
      if (m) {
        pages = { from: Number(m[1]), to: Number(m[2]) };
      } else if (text === "반말") {
        register = "casual";
      } else if (text === "존댓말") {
        register = "polite";
      } else if (isPageNumber(text)) {
        // 쪽 번호
      } else if (hasHangul(text)) {
        (ja.length === 0 ? subtitle : ko).push(text);
      } else {
        ja.push(text);
      }
    }
  }
  return {
    title: tidyJa(ja.join("")),
    titleKo: tidyKo(joinWrappedKo(ko)),
    ...(subtitle.length > 0 ? { subtitle: tidyKo(subtitle.join(" ")) } : {}),
    register,
    pages,
  };
}

/**
 * 단어 한 칸: `彼氏[かれし] 남자 친구`, `間に合う[まにあう] ⑤ 시간에 대다`, `おはよう 안녕(아침 인사)`.
 * 한국어로 시작하면 앞 칸의 뜻이 줄을 넘어온 것이다.
 */
export function parseWordItem(
  text: string,
): Sentence | { continuation: string } {
  const t = text.trim();
  const tokens = t.split(/\s+/);
  const startsMeaning = (tok: string) =>
    hasHangul(tok) || /^[~(（①-⑳]/.test(tok);
  if (startsMeaning(tokens[0]) && (hasHangul(t) || /^[~①-⑳]/.test(t))) {
    return { continuation: t.replace(/^[①-⑳]\s*/, "") };
  }
  let k = tokens.findIndex((tok, i) => i > 0 && startsMeaning(tok));
  // 뜻이 영어 약어뿐인 단어(`パソコン PC`)
  if (k < 0) k = tokens.findIndex((tok, i) => i > 0 && /^[A-Za-z]/.test(tok));
  const jaPart = k > 0 ? tokens.slice(0, k).join(" ") : t;
  const ko =
    k > 0
      ? tidyKo(
          tokens
            .slice(k)
            .join(" ")
            .replace(/^[①-⑳]\s*/, ""),
        )
      : "";
  const r = jaPart.match(/^(.*?)\[([^\]]+)\]$/);
  if (r) return { ja: r[1].trim(), reading: r[2].trim(), ko };
  // 읽는 법이 낱말 가운데 있는 경우(`お願[ねが]いします`)는 읽는 법을 빼고 둔다
  return {
    ja: tidyJa(jaPart.replace(/\[[^\]]*\]/g, "")).replace(/\s+/g, ""),
    ko,
  };
}

/**
 * 두 단으로 놓인 단어 목록. 소리는 왼쪽 단을 위에서 아래로 다 읽고 오른쪽 단으로 간다.
 * 오른쪽 단은 왼쪽 시작보다 한참 오른쪽에서 새 단어가 시작하는 위치들 중 가장 왼쪽으로 잡는다.
 * 뜻이 넘어온 줄(한글로 시작)은 그 단의 앞 단어에 붙이고, 뜻 없이 끝난 단어 뒤에 가나로 시작하는
 * 조각이 오면 읽는 법·낱말이 줄을 넘은 것으로 보고 잇는다.
 */
export function parseWordColumns(lines: string[]): Sentence[] {
  const rows: Segment[][] = lines
    .filter((l) => !isSkippable(l))
    .map((l) => splitSegments(l));
  const all = rows.flat();
  if (all.length === 0) return [];
  const leftStart = Math.min(...all.map((s) => s.start));
  const itemStarts = all
    .filter(
      (s) =>
        s.start > leftStart + 10 && !("continuation" in parseWordItem(s.text)),
    )
    .map((s) => s.start);
  const rightStart =
    itemStarts.length > 0 ? Math.min(...itemStarts) : Number.POSITIVE_INFINITY;

  const columns: { raw: string; item: Sentence }[][] = [[], []];
  for (const row of rows) {
    for (const seg of row) {
      const list = columns[seg.start >= rightStart - 3 ? 1 : 0];
      const last = list[list.length - 1];
      const parsed = parseWordItem(seg.text);
      if ("continuation" in parsed) {
        if (last)
          last.item.ko = last.item.ko
            ? `${last.item.ko} ${parsed.continuation}`
            : parsed.continuation;
      } else if (last && last.item.ko === "") {
        const raw = `${last.raw}${seg.text}`;
        const merged = parseWordItem(raw);
        if (!("continuation" in merged))
          list[list.length - 1] = { raw, item: merged };
      } else {
        list.push({ raw: seg.text, item: parsed });
      }
    }
  }
  return [...columns[0], ...columns[1]].map((c) => c.item);
}

/** 문형 머리 줄: `1 ～は～。   ~는 ~야.`, `1 来た。   왔어.` */
const PATTERN_HEAD_RE = /^(\s*)(\d{1,2})\s+(\S.*)$/;
/** 문형 옆에 붙은 활용형 표시(`た형`, `ない형`). 소리로 읽지 않는다 */
const FORM_LABEL_RE = /^[ぁ-ん]{1,3}형$/;

/**
 * 기본 문형 익히기. 문형 머리(번호로 시작) 아래에 일본어·한국어 문장이 온다.
 * 문형 머리가 두 줄이면 둘째 줄은 머리 번호보다 오른쪽에서 시작하고,
 * 예문은 머리 번호보다 왼쪽에서 시작한다(쪽마다 들여쓰기는 달라도 이 관계는 같다).
 */
export function parsePatterns(lines: string[]): {
  patterns: Pattern[];
  sentences: Sentence[];
} {
  const patterns: Pattern[] = [];
  const sentences: Sentence[] = [];
  let current: Pattern | undefined;
  let headIndent = -1;
  let inHead = false;
  let pendingJa = "";

  const splitJaKo = (line: string) => {
    const ja: string[] = [];
    const ko: string[] = [];
    for (const { text } of splitSegments(line)) {
      if (isPageNumber(text) || FORM_LABEL_RE.test(text)) continue;
      (hasHangul(text) ? ko : ja).push(text);
    }
    return { ja: ja.join(""), ko: ko.join(" ") };
  };

  for (const raw of lines) {
    if (isSkippable(raw)) continue;
    const line = raw.replace(/\t/g, " ");
    const { ja, ko } = splitJaKo(line);
    if (!ja && !ko) continue; // 활용형 표시만 있는 줄
    const indent = line.length - line.trimStart().length;
    const head = line.match(PATTERN_HEAD_RE);
    if (head) {
      const parts = splitJaKo(head[3]);
      current = {
        no: Number(head[2]),
        ja: tidyJa(parts.ja),
        ko: tidyKo(parts.ko),
      };
      patterns.push(current);
      headIndent = head[1].length;
      inHead = true;
      continue;
    }
    if (inHead && current && indent > headIndent) {
      // 문형 머리의 둘째 줄(`うん、～。` / `ううん、～じゃない。`)
      current.ja = tidyJa(`${current.ja} / ${ja}`);
      current.ko = tidyKo(`${current.ko} / ${ko}`);
      continue;
    }
    inHead = false;
    const pattern = current?.no;
    if (ja && ko) {
      sentences.push({
        ja: tidyJa(pendingJa + ja),
        ko: tidyKo(ko),
        ...(pattern ? { pattern } : {}),
      });
      pendingJa = "";
    } else if (ja) {
      pendingJa += ja;
    } else if (ko) {
      if (pendingJa) {
        sentences.push({
          ja: tidyJa(pendingJa),
          ko: tidyKo(ko),
          ...(pattern ? { pattern } : {}),
        });
        pendingJa = "";
      } else {
        const last = sentences[sentences.length - 1];
        if (last) last.ko = tidyKo(`${last.ko} ${ko}`);
      }
    }
  }
  if (pendingJa)
    sentences.push({
      ja: tidyJa(pendingJa),
      ko: "",
      ...(current ? { pattern: current.no } : {}),
    });
  return { patterns, sentences };
}

type KoTurn = { text: string };

/** 말하는 사람 이름이나 대사(지문 괄호를 뺀 것)에 한글이 있으면 한국어 대사다 */
function isKoreanTurn(speaker: string, text: string): boolean {
  const withoutDirections = stripKoreanDirections(text).replace(
    /[(（][^)）]*$/,
    "",
  );
  return hasHangul(speaker) || hasHangul(withoutDirections);
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * 한국어 대사. 두 단일 때는 왼쪽·오른쪽 사람이 한 줄에 같이 오고, 단 사이 공백이 한 칸뿐인
 * 줄도 있다. 그래서 칸 맨 앞에 나온 이름들을 먼저 모으고, 줄 가운데에서 그 이름이 나오면
 * 거기서 나눈다. 이름 없는 줄은 앞 대사가 넘어온 것이고, 시작 위치로 어느 단인지 가린다.
 */
function parseKoreanTurns(lines: string[]): KoTurn[] {
  const names = new Set<string>();
  for (const line of lines) {
    for (const cell of splitSegments(line, 5)) {
      const m = cell.text.match(SPEAKER_RE);
      if (m) names.add(m[1].trim());
    }
  }
  const nameRe =
    names.size > 0
      ? new RegExp(
          `\\s(?=(?:${[...names].map(escapeRegExp).join("|")})\\s*[:：]\\s)`,
        )
      : undefined;

  const turns: KoTurn[] = [];
  const current: [KoTurn | undefined, KoTurn | undefined] = [
    undefined,
    undefined,
  ];
  let rightStart: number | undefined;
  for (const line of lines) {
    const pieces = splitSegments(line, 5).flatMap((cell) => {
      if (!nameRe) return [cell];
      const parts = cell.text.split(nameRe);
      let offset = cell.start;
      return parts.map((text) => {
        const piece = { text: text.trim(), start: offset };
        offset += text.length + 1;
        return piece;
      });
    });
    pieces.forEach((piece, idx) => {
      if (idx > 0 && (rightStart === undefined || piece.start < rightStart))
        rightStart = piece.start;
      const col: 0 | 1 =
        idx > 0 ||
        (rightStart !== undefined &&
          piece.start >= Math.min(rightStart - 6, 30))
          ? 1
          : 0;
      const m = piece.text.match(SPEAKER_RE);
      if (m) {
        const turn = { text: m[2] };
        turns.push(turn);
        current[col] = turn;
      } else {
        const turn = current[col] ?? current[0];
        if (turn) turn.text = appendWrappedKo(turn.text, piece.text);
      }
    });
  }
  return turns;
}

/**
 * 회화로 다지기: `단어` 목록, `회화` 아래 일본어 대사들, 이어서 같은 수의 한국어 대사들.
 * 한국어 대사는 두 단으로 놓이기도 한다(왼쪽·오른쪽 사람이 번갈아 말함). 그때도 줄 순서로
 * 왼쪽 → 오른쪽 차례가 말한 차례다.
 */
export function parseConversationSection(lines: string[]): {
  words: Sentence[];
  sentences: Sentence[];
  issue?: string;
} {
  const wordsAt = lines.findIndex((l) => l.trim() === "단어");
  const dialogueAt = lines.findIndex((l) => l.trim() === "회화");
  if (dialogueAt < 0)
    return { words: [], sentences: [], issue: "회화 머리를 찾지 못함" };
  const words =
    wordsAt >= 0 && wordsAt < dialogueAt
      ? parseWordColumns(lines.slice(wordsAt + 1, dialogueAt))
      : [];

  const dialogue = lines
    .slice(dialogueAt + 1)
    .filter((l) => !isSkippable(l))
    .map((l) => l.replace(/\t/g, " "));

  // 일본어 대사: 한국어 대사가 시작되기 전까지
  const jaTurns: { speaker: string; text: string }[] = [];
  let koAt = dialogue.length;
  for (let i = 0; i < dialogue.length; i++) {
    const line = dialogue[i];
    const m = line.match(SPEAKER_RE);
    if (m && isKoreanTurn(m[1], m[2])) {
      koAt = i;
      break;
    }
    if (m) {
      jaTurns.push({ speaker: tidyJa(m[1]), text: m[2] });
    } else {
      const last = jaTurns[jaTurns.length - 1];
      if (last) last.text += line.trim();
    }
  }

  const koTurns = parseKoreanTurns(dialogue.slice(koAt));

  if (jaTurns.length !== koTurns.length) {
    return {
      words,
      sentences: [],
      issue: `회화 대사 수가 맞지 않음(일본어 ${jaTurns.length}, 한국어 ${koTurns.length})`,
    };
  }
  const sentences: Sentence[] = [];
  jaTurns.forEach((turn, i) => {
    const ja = tidyJa(stripKoreanDirections(turn.text));
    if (!ja) return;
    sentences.push({ ja, ko: tidyKo(koTurns[i].text), speaker: turn.speaker });
  });
  return { words, sentences };
}
