/**
 * whisper가 말소리 없이 지어내는 글을 가린다.
 * - 무음·음악에서 자주 나오는 정해진 문구(자막 제작자, 구독 인사 등)
 * - 한 구간 안에서 같은 말이 계속 되풀이되는 글
 * - 파일 안에서 같은 구간이 잇달아 되풀이되는 것
 */

const KNOWN_PHRASES = [
  /자막\s*(제공|제작|by)/i,
  /한글\s*자막/,
  /시청해\s*주셔서\s*감사합니다/,
  /구독(과|이나|,)?\s*좋아요/,
  /다음\s*영상에서\s*만나요/,
  /ご視聴(いただき)?ありがとうございました/,
  /チャンネル登録/,
  /次の動画でお会いしましょう/,
  /字幕(制作|提供|作成)/,
  /thank(s| you) for watching/i,
  /subtitles? by/i,
  /Редактор субтитров/i,
];

/** 말이 아니라 소리를 적은 표시만 있는 글(`[音楽]`, `(음악)`, `♪`, `BGM`) */
const NON_SPEECH =
  /^[\s[\](){}（）「」『』【】♪〜~.,!?。、・-]*(音楽|音楽が流れる|拍手|笑|음악|박수|music|bgm|applause)?[\s[\](){}（）「」『』【】♪〜~.,!?。、・-]*$/i;

export function isKnownHallucination(text: string): boolean {
  return KNOWN_PHRASES.some((re) => re.test(text));
}

export function isNonSpeech(text: string): boolean {
  return NON_SPEECH.test(text.trim());
}

/** 문장 부호·공백을 뺀 글. 되풀이를 비교할 때 쓴다. */
export function compact(text: string): string {
  return text.replace(/[\s\p{P}\p{S}]/gu, "");
}

/**
 * 한 구간 안에서 같은 말이 잇달아 되풀이되는지.
 * 1~2글자 말은 6번 이상, 3글자 넘는 말은 3번 이상 이어지면 되풀이로 본다.
 */
export function hasRunawayRepeat(text: string): boolean {
  const s = compact(text);
  return /(.{1,2})\1{5,}/u.test(s) || /(.{3,30}?)\1{2,}/u.test(s);
}

/** 구간 글이 지어낸 것으로 보이는지(정해진 문구, 소리 표시, 되풀이) */
export function isSuspectText(text: string): boolean {
  return (
    isKnownHallucination(text) || isNonSpeech(text) || hasRunawayRepeat(text)
  );
}

/**
 * 말소리로 칠 글자: 가나(장음 기호 ー·반복 기호는 빼고), 한자, 한글, 영문, 숫자.
 * ー·〜·♪ 같은 기호만 있는 줄은 음악 구간에서 음성 인식이 지어낸 것으로 본다.
 */
const SPEECH_CHAR =
  /[ぁ-ゖァ-ヺｦ-ｯｱ-ﾝ\p{Script=Han}\p{Script=Hangul}A-Za-zＡ-Ｚａ-ｚ\p{Nd}]/u;

export function hasSpeechChar(text: string): boolean {
  return SPEECH_CHAR.test(text);
}

/**
 * 노래 끝에 붙는 제작진 표기(작사·작곡·편곡 등). 음악 구간에서 음성 인식이 곧잘 지어낸다.
 * 줄 첫머리(기호 뒤)의 표기 낱말 바로 뒤에 구분 기호·빈칸이 오거나 줄이 끝나는 모양만 본다.
 * "作曲家", "작곡했어요"처럼 문장 속 낱말은 남기고, 긴 줄도 건드리지 않는다.
 */
const CREDIT_WORD = "(?:作詞|作曲|編曲|作・編曲|작사|작곡|편곡)";
const CREDIT = new RegExp(
  `^[\\s\\p{P}\\p{S}]*${CREDIT_WORD}(?:[\\s:：・/／、,，]|$)|^[\\s\\p{P}\\p{S}]*(?:lyrics|music|composed|arranged)\\s+by\\b`,
  "iu",
);
const CREDIT_MAX_CHARS = 40;

export function isCreditLine(text: string): boolean {
  return compact(text).length <= CREDIT_MAX_CHARS && CREDIT.test(text);
}

/**
 * 영문 한 글자만 있는 줄(「E」「A.」). 교재 오디오는 일본어·한국어뿐이라 글자 종류부터 틀렸다.
 * 짧은 감탄사(え 등)를 영문으로 받아 적은 것으로 보이지만 무엇인지 알 수 없어 고치지 않고 뺀다.
 */
const LONE_LATIN = /^[\s\p{P}ー〜~]*[A-Za-zＡ-Ｚａ-ｚ][\s\p{P}ー〜~]*$/u;

export function isLoneLatin(text: string): boolean {
  return LONE_LATIN.test(text);
}

const LATIN_LETTER = /[A-Za-zＡ-Ｚａ-ｚ]/gu;
/** 말소리 글자 하나하나(가나·한자·한글·영문·숫자) */
const SPEECH_CHARS = new RegExp(SPEECH_CHAR.source, "gu");
/** 영문이 이만큼 넘게 차지하면 영문 줄로 본다 */
const LATIN_SHARE = 0.6;

/**
 * 영문이 대부분인 줄(「got it!」「warming up」). 교재 오디오는 일본어·한국어뿐이라,
 * 강사의 말이나 잡음을 영어로 잘못 받아 적은 것이다.
 * 대문자 세 글자까지의 줄임말(DVD·OK·CD)만 있는 줄은 실제로 쓰는 말이라 남긴다.
 */
export function isLatinLine(text: string): boolean {
  const latin = text.match(LATIN_LETTER)?.length ?? 0;
  if (latin < 2) return false;
  const speech = text.match(SPEECH_CHARS)?.length ?? 0;
  if (latin / speech <= LATIN_SHARE) return false;
  const tokens = text.normalize("NFKC").match(/[A-Za-z]+/g) ?? [];
  return !tokens.every((t) => /^[A-Z]{1,3}$/.test(t));
}

/** 한글 낱자(ㄱ·ㅏ)와 부호만 있는 줄(「ㅇ,」「ㄹ」). 말소리를 글자로 옮기지 못한 자리다 */
const JAMO_ONLY = /^[\s\p{P}ㄱ-ㅎㅏ-ㅣ]*[ㄱ-ㅎㅏ-ㅣ][\s\p{P}ㄱ-ㅎㅏ-ㅣ]*$/u;

export function isJamoOnly(text: string): boolean {
  return JAMO_ONLY.test(text);
}

/**
 * 자막을 내줄 때 뺄 줄: 말소리 글자가 하나도 없는 줄, 영문 한 글자 줄, 영문이 대부분인 줄,
 * 한글 낱자만 있는 줄, 제작진 표기 줄, 정해진 환각 문구.
 * 한 글자 대답(「え」「はい」 등)처럼 가나·한글·숫자가 하나라도 있는 짧은 줄은 남긴다.
 */
export function isNoiseLine(text: string): boolean {
  return (
    !hasSpeechChar(text) ||
    isLoneLatin(text) ||
    isLatinLine(text) ||
    isJamoOnly(text) ||
    isCreditLine(text) ||
    isKnownHallucination(text)
  );
}

/** 길이가 이보다 짧은 구간은 소리가 아니라 음성 인식이 끼워 넣은 자리로 본다(초) */
const BLIP_SEC = 0.05;
/** 되풀이 묶음으로 볼 짧은 글의 최대 글자 수와 최소 횟수 */
const BLIP_RUN_CHARS = 2;
const BLIP_RUN_MIN = 3;

type Timed = { text: string; start: number; end: number };

/**
 * 같은 짧은 글(부호 뺀 1~2글자)이 잇달아 3번 넘게 나오고 그 안에 길이 0에 가까운 구간이 낀 묶음.
 * 음악 구간에서 「一」 같은 글자를 0.1초 간격으로 지어낼 때 생긴다.
 * 반복 연습처럼 사람이 같은 낱말을 세 번 말한 것은 구간마다 길이가 있어 걸리지 않는다.
 */
export function blipRunIndexes(segments: Timed[]): Set<number> {
  const out = new Set<number>();
  let i = 0;
  while (i < segments.length) {
    const c = compact(segments[i].text);
    let j = i + 1;
    while (j < segments.length && compact(segments[j].text) === c) j++;
    const run = segments.slice(i, j);
    if (
      run.length >= BLIP_RUN_MIN &&
      [...c].length <= BLIP_RUN_CHARS &&
      run.some((s) => s.end - s.start < BLIP_SEC)
    )
      for (let k = i; k < j; k++) out.add(k);
    i = j;
  }
  return out;
}

/**
 * 잡음 줄(isNoiseLine)과 지어낸 되풀이 묶음(blipRunIndexes)을 뺀 구간들.
 * 원본 자막 파일은 그대로 두고 내줄 때만 거른다.
 */
export function withoutNoise<T extends Timed>(segments: T[]): T[] {
  const blips = blipRunIndexes(segments);
  return segments.filter((s, i) => !blips.has(i) && !isNoiseLine(s.text));
}

/** 같은 글(부호·공백 무시)이 잇달아 나온 가장 긴 횟수와 그 글 */
export function longestSameRun(texts: string[]): {
  count: number;
  text: string;
} {
  let best = { count: 0, text: "" };
  let run = 0;
  let prev: string | undefined;
  for (const t of texts) {
    const c = compact(t);
    run = c === prev ? run + 1 : 1;
    prev = c;
    if (run > best.count) best = { count: run, text: t };
  }
  return best;
}
