import { describe, expect, it } from "vitest";
import type { DictEntry } from "@/lib/dictionary/entries";
import { dictChips } from "./dict-words";

// 사전 색인 항목 모양을 따른 가짜 낱말(교재 문장이 아니다)

function entry(over: Partial<DictEntry> & { word: string }): DictEntry {
  return {
    id: over.word,
    readings: [],
    pos: [],
    glosses: [],
    firstLesson: 1,
    ilmuntaLesson: null,
    sources: ["ilmuta-words"],
    occurrences: [],
    ...over,
  };
}

const words = (chips: ReturnType<typeof dictChips>) =>
  chips.words.map((w) => w.ja);

describe("사전 색인에서 고르는 칩 낱말", () => {
  it("읽기가 하나인 한자 낱말은 읽는 법·첫 뜻으로 칩을 만든다", () => {
    const chips = dictChips(
      [entry({ word: "山", readings: ["やま"], glosses: ["산", "뫼"] })],
      [],
    );
    expect(chips.words).toEqual([{ ja: "山", reading: "やま", ko: "산" }]);
  });

  it("읽기가 둘 이상인 한자 낱말은 어느 쪽인지 몰라 뺀다", () => {
    const chips = dictChips(
      [entry({ word: "何", readings: ["なに", "なん"], glosses: ["무엇"] })],
      [],
    );
    expect(words(chips)).toEqual([]);
  });

  it("예문 분석에서만 나온 낱말은 뜻이 하나일 때만, 조사·조동사는 빼고 받는다", () => {
    const analysis = { sources: ["analysis" as const] };
    const chips = dictChips(
      [
        entry({
          word: "海",
          readings: ["うみ"],
          glosses: ["바다"],
          ...analysis,
        }),
        entry({
          word: "手",
          readings: ["て"],
          glosses: ["손", "수단"],
          ...analysis,
        }),
        entry({ word: "から", glosses: ["~부터"], pos: ["助詞"], ...analysis }),
      ],
      [],
    );
    expect(words(chips)).toEqual(["海"]);
  });

  it("upto가 있으면 그 강까지 나온 낱말만 받는다", () => {
    const list = [
      entry({
        word: "山",
        readings: ["やま"],
        glosses: ["산"],
        firstLesson: 3,
      }),
      entry({
        word: "川",
        readings: ["かわ"],
        glosses: ["강"],
        firstLesson: 9,
      }),
      entry({
        word: "空",
        readings: ["そら"],
        glosses: ["하늘"],
        firstLesson: null,
      }),
    ];
    expect(words(dictChips(list, [], 5))).toEqual(["山"]);
    expect(words(dictChips(list, []))).toEqual(["山", "川", "空"]);
  });

  it("예문 분석의 활용한 꼴은 기본형이 칩으로 뽑힌 것만 그 칩으로 잇는다", () => {
    const chips = dictChips(
      [entry({ word: "歩く", readings: ["あるく"], glosses: ["걷다"] })],
      [
        { surface: "歩いた", base: "歩く", lesson: 1 },
        { surface: "走った", base: "走る", lesson: 1 },
      ],
    );
    expect(chips.inflected).toEqual([
      { form: "歩いた", word: { ja: "歩く", reading: "あるく", ko: "걷다" } },
    ]);
  });
});
