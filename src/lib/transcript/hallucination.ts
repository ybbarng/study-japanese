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
