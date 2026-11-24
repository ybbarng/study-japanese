import { normalizeJa } from "./match";
import { hangulPhones, kanaPhones, phoneSimilarity } from "./phonetic";

// 강사의 한국어 말을 whisper가 일본어 줄(가타카나)로 받아 적은 곳을 찾는다. 화면을 모르는 순수 함수다.
// 초급자는 "지금 일본어" 칸에 뜬 글을 일본어로 믿으므로, 한국어 말을 옮긴 가타카나 줄은 내주지 않는다.
// 한국어 말은 가나로 옮기면 히라가나 없이 가타카나만 이어지는 일이 많다(워밍업 → ワーミングアップ).
// 진짜 가타카나 외래어(カーテン·テレビ)는 교재 낱말로 덮이면 남긴다.

export interface MisheardSegment {
  text: string;
  lang: "ko" | "ja";
}

/** 비교에서 뺄 글자: 공백·부호·기호·장음 기호 */
const NOT_CORE = /[\s\p{P}\p{S}ー]/gu;
const KATAKANA_ONLY = /^[ァ-ヺ]+$/u;

/**
 * 교재 오디오가 단계마다 한국어로 읽는 이름표를 가타카나로 받아 적은 모양.
 * 워밍업(ワーミングアップ·ウォーミングアップ), 회화·회화로 다지기(フェイファー·フェファロータジキ).
 */
const KOREAN_LABELS = [/^(?:ワ|ウォ)ミングアップ$/u, /^フェ[イェ]?[ファバワ]/u];

/** 이만큼 긴 가타카나 줄은 교재 낱말로 덮이지 않으면 한국어 말로 본다(가나 수, 장음 뺌) */
const LONG_KATAKANA = 7;
/** 앞뒤가 모두 한국어 줄일 때 한국어 말로 볼 가나 수 */
const BETWEEN_KOREAN = 4;
/** 앞뒤 한국어 줄의 한 토막과 소리가 이만큼 닮으면 그 말을 받아 적은 것으로 본다 */
const ECHO_SIMILARITY = 0.7;
const ECHO_MIN_PHONES = 4;
/** 앞뒤 몇 구간까지 한국어 줄을 견주나 */
const ECHO_NEAR = 2;

/** 가타카나만 남긴 알맹이. 히라가나·한자 등이 섞이면 null */
function katakanaCore(text: string): string | null {
  const core = text.replace(NOT_CORE, "");
  return KATAKANA_ONLY.test(core) ? core : null;
}

/** 비교용 글(히라가나)이 아는 낱말(두 글자 이상)로 빈틈없이 덮이나 */
export function coveredByWords(plain: string, known: Set<string>): boolean {
  const chars = [...plain];
  const ok: boolean[] = [true];
  for (let i = 1; i <= chars.length; i++) {
    ok[i] = false;
    for (let j = Math.max(0, i - 12); j <= i - 2 && !ok[i]; j++)
      if (ok[j] && known.has(chars.slice(j, i).join(""))) ok[i] = true;
  }
  return ok[chars.length];
}

/** 한국어 글 속 한글 토막(띄어쓰기 무시) 가운데 소리가 가장 닮은 것의 닮은 정도 */
function bestEcho(phones: string, korean: string): number {
  const syllables = [...korean.replace(/[^가-힣]/g, "")];
  let best = 0;
  for (let i = 0; i < syllables.length; i++)
    for (let n = 1; n <= 10 && i + n <= syllables.length; n++) {
      const score = phoneSimilarity(
        phones,
        hangulPhones(syllables.slice(i, i + n).join("")),
      );
      if (score > best) best = score;
    }
  return best;
}

/**
 * 한국어 말을 가타카나로 받아 적은 일본어 줄의 차례.
 * 가타카나뿐이고 아는 낱말로 덮이지 않는 줄 가운데
 * ① 단계 이름표 모양 ② 가나 7자 이상 ③ 앞뒤 한국어 줄의 한 토막과 소리가 닮음 ④ 앞뒤가 모두 한국어 줄이고 4자 이상.
 * known은 교재 낱말의 비교용 글(normalizeJa한 표기·읽는 법).
 */
export function misheardKoreanIndexes(
  segments: MisheardSegment[],
  known: Set<string>,
): Set<number> {
  const out = new Set<number>();
  segments.forEach((seg, i) => {
    if (seg.lang !== "ja") return;
    const core = katakanaCore(seg.text);
    if (!core || coveredByWords(normalizeJa(core), known)) return;
    const length = [...core].length;
    const prev = segments[i - 1];
    const next = segments[i + 1];
    const phones = kanaPhones(core);
    const echo =
      phones.length >= ECHO_MIN_PHONES &&
      segments
        .slice(Math.max(0, i - ECHO_NEAR), i + ECHO_NEAR + 1)
        .some(
          (s) => s.lang === "ko" && bestEcho(phones, s.text) >= ECHO_SIMILARITY,
        );
    if (
      KOREAN_LABELS.some((re) => re.test(core)) ||
      length >= LONG_KATAKANA ||
      echo ||
      (length >= BETWEEN_KOREAN && prev?.lang === "ko" && next?.lang === "ko")
    )
      out.add(i);
  });
  return out;
}

/** 한국어 말을 가타카나로 받아 적은 일본어 줄을 뺀 구간들(원래 차례는 그대로) */
export function withoutMisheardKorean<T extends MisheardSegment>(
  segments: T[],
  known: Set<string>,
): T[] {
  const drop = misheardKoreanIndexes(segments, known);
  return drop.size === 0 ? segments : segments.filter((_, i) => !drop.has(i));
}

/**
 * 강사가 문형을 설명할 때 쓰는 한국어 자리 말(누구누구·뭐뭐)을 가나로 받아 적은 줄(ぬぐぬぐの…)을
 * 들린 대로 한국어 자리 말로 돌린 글. ぬぐ가 없는 줄은 일본어일 수 있어 null(もも는 桃일 수도 있다).
 */
export function placeholderText(text: string): string | null {
  if (!/ぬぐ/u.test(text)) return null;
  return text
    .replace(/(?:ぬぐ)+/gu, "누구누구")
    .replace(/もも(?:も)*/gu, "뭐뭐");
}
