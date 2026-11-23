import type { Example, IlmutaLesson } from "@/lib/textbook/schema";

// 테스트용 가짜 강. 교재 글을 옮기지 않고 모양만 같은 짧은 문장을 쓴다.

export function fakeExample(
  id: string,
  kind: Example["kind"],
  over: Partial<Example> = {},
): Example {
  return {
    id,
    file: `2. 예문 mp3/${id}.mp3`,
    durationSec: 30,
    kind,
    sentences: [],
    ...over,
  };
}

export function fakeLesson(
  no: number,
  over: Partial<IlmutaLesson> = {},
): IlmutaLesson {
  const nn = String(no).padStart(2, "0");
  return {
    no,
    title: no === 0 ? "" : `テスト${no}。`,
    titleKo: no === 0 ? undefined : `시험 ${no}.`,
    register: "casual",
    lecture: { file: `1. 음성 강의/L${nn}.mp3`, durationSec: 600 },
    examples:
      no === 0
        ? []
        : [
            fakeExample(`${nn}-1`, "dialogue"),
            fakeExample(`${nn}-2`, "words", {
              sentences: [{ ja: "山", ko: "산", reading: "やま" }],
            }),
            fakeExample(`${nn}-3`, "patterns", {
              patterns: [{ no: 1, ja: "～は～。", ko: "~는 ~야." }],
              sentences: [{ ja: "山は高い。", ko: "산은 높아.", pattern: 1 }],
            }),
            fakeExample(`${nn}-4-1`, "conversationBasic", {
              sentences: [
                { ja: "やあ。", ko: "안녕.", speaker: "A" },
                { ja: "うん。", ko: "응.", speaker: "B" },
              ],
            }),
            fakeExample(`${nn}-4-2`, "conversationAdvanced", {
              sentences: [
                { ja: "やあ。", ko: "안녕.", speaker: "A" },
                { ja: "うん。", ko: "응.", speaker: "B" },
              ],
            }),
            fakeExample(`${nn}-5`, "exercise"),
          ],
    ...over,
  };
}
