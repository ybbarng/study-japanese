import { romajiToKana, toHiragana } from "@/lib/kana/text";
import type { Form } from "./conjugate";

/** 입력을 비교할 꼴로: 앞뒤·가운데 빈칸과 마침표를 지우고, 가타카나는 히라가나로 */
export function normalizeAnswer(input: string): string {
  return toHiragana(input.replace(/[\s　。．.]/g, ""));
}

/** 로마자만 쳤으면 가나로 바꾼다(입력기 없이 칠 때) */
export function toKanaIfRomaji(input: string): string {
  const t = input.trim();
  if (/^[a-zA-Z' -]+$/.test(t)) return romajiToKana(t, "hira", true);
  return input;
}

/** 쳐 넣은 답이 맞는 답(한자 표기나 읽기) 가운데 하나와 같은지 */
export function isCorrectAnswer(
  input: string,
  accepted: readonly Form[],
): boolean {
  const given = normalizeAnswer(toKanaIfRomaji(input));
  if (!given) return false;
  return accepted.some(
    (f) =>
      given === normalizeAnswer(f.reading) ||
      given === normalizeAnswer(f.kanji),
  );
}

/**
 * 바뀐 끝을 보여 주려고 바탕 꼴과 답이 같은 앞부분(줄기)을 나눈다.
 * 飲む → 飲んで: { stem: 飲, from: む, to: んで }
 */
export function splitChange(
  base: string,
  answer: string,
): { stem: string; from: string; to: string } {
  const a = [...base];
  const b = [...answer];
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  return {
    stem: b.slice(0, i).join(""),
    from: a.slice(i).join(""),
    to: b.slice(i).join(""),
  };
}
