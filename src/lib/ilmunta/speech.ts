import type { Question } from "./question";
import { rubyPlain, rubyReading } from "./ruby-text";

/**
 * 드릴 문제를 답한 뒤 소리로 읽을 글. 문장 빈칸 문제면 정답을 채운 문장, 활용표 문제면 정답 꼴.
 * text는 음성 합성용(한자 섞인 글), kana는 음성이 없을 때 글자 소리를 잇는 읽기.
 */
export function drillSpeech(q: Pick<Question, "answer" | "sentence">): {
  text: string;
  kana: string;
} {
  const s = q.sentence;
  if (!s) return { text: q.answer.kanji, kana: q.answer.reading };
  return {
    text: `${rubyPlain(s.before)}${q.answer.kanji}${rubyPlain(s.after)}`,
    kana: `${rubyReading(s.before)}${q.answer.reading}${rubyReading(s.after)}`,
  };
}
