import { describe, expect, it } from "vitest";
import { buildDictionary, type DictInput, summarize } from "./entries";
import { searchDictionary } from "./search";
import { findSentenceCue } from "./sentence-cue";

// 교재 글이 아니라 모양만 같은 지어낸 낱말·문장
const input: DictInput = {
  ilmutaWords: [
    { lesson: 2, words: [{ ja: "山", reading: "やま", ko: "산" }] },
    { lesson: 1, words: [{ ja: "テスト", ko: "시험" }] },
  ],
  drill: [
    {
      dict: "行く",
      reading: "いく",
      ko: "가다",
      drill: { kind: "verb", group: "godan" },
      ilmuta: 5,
      ilmunta: 3,
    },
  ],
  analyzed: [
    {
      lesson: 1,
      example: "01-3",
      index: 0,
      tokens: [
        { surface: "山", reading: "やま", pos: "名詞", gloss: "산(문장 뜻)" },
        { surface: "に", pos: "助詞", gloss: "~에" },
        {
          surface: "行きます",
          reading: "いきます",
          base: "行く",
          pos: "動詞",
          gloss: "갑니다",
        },
        { surface: "。", plain: true },
      ],
    },
    // 같은 문장이 다른 예문에 되풀이된 자리
    {
      lesson: 1,
      example: "01-4-1",
      index: 2,
      tokens: [{ surface: "山", reading: "やま", pos: "名詞", gloss: "산" }],
    },
  ],
};

const dict = buildDictionary(input);
const byId = new Map(dict.map((e) => [e.id, e]));

describe("buildDictionary", () => {
  it("교재 단어·드릴 낱말·예문 낱말을 기본형 하나로 모은다", () => {
    expect([...byId.keys()].sort()).toEqual(
      ["に", "テスト", "山", "行く"].sort(),
    );
  });

  it("교재 단어 뜻을 대표로 두고, 괄호 설명만 다른 예문 분석 뜻은 같은 뜻으로 합친다", () => {
    expect(byId.get("山")?.glosses).toEqual(["산"]);
  });

  it("드릴 뜻 뒤에 예문 분석의 새 뜻을 다른 뜻으로 붙인다", () => {
    expect(byId.get("行く")?.glosses).toEqual(["가다", "갑니다"]);
  });

  it("처음 배운 강은 단어 코너·예문 중 가장 앞 강", () => {
    expect(byId.get("山")?.firstLesson).toBe(1);
  });

  it("나오는 예문 자리를 모두 모은다", () => {
    expect(byId.get("山")?.occurrences).toEqual([
      { lesson: 1, example: "01-3", index: 0 },
      { lesson: 1, example: "01-4-1", index: 2 },
    ]);
  });

  it("활용한 꼴은 기본형 항목에 모으고, 활용한 꼴의 읽기는 기본형 읽기로 넣지 않는다", () => {
    const iku = byId.get("行く");
    expect(iku?.readings).toEqual(["いく"]);
    expect(iku?.drill).toEqual({ kind: "verb", group: "godan" });
    expect(iku?.ilmuntaLesson).toBe(3);
    expect(iku?.firstLesson).toBe(1);
  });

  it("가나 낱말은 겉모양을 읽기로 둔다", () => {
    expect(byId.get("テスト")?.readings).toEqual(["テスト"]);
  });

  it("처음 배운 강 차례로 늘어놓는다", () => {
    expect(dict.map((e) => e.firstLesson)).toEqual([1, 1, 1, 1]);
  });
});

describe("searchDictionary", () => {
  const list = dict.map(summarize);

  it("표기·히라가나 읽기·가타카나·로마자로 찾는다", () => {
    expect(searchDictionary(list, "山").map((e) => e.id)).toEqual(["山"]);
    expect(searchDictionary(list, "やま").map((e) => e.id)).toEqual(["山"]);
    expect(searchDictionary(list, "ヤマ").map((e) => e.id)).toEqual(["山"]);
    expect(searchDictionary(list, "yama").map((e) => e.id)).toEqual(["山"]);
  });

  it("한국어 뜻으로 찾는다", () => {
    expect(searchDictionary(list, "가다").map((e) => e.id)).toEqual(["行く"]);
  });

  it("같은 것을 앞이 맞는 것보다 먼저 보인다", () => {
    const words = [
      { ...list[0], id: "a", word: "てすとちゅう", readings: [] },
      { ...list[0], id: "b", word: "てすと", readings: [] },
    ];
    expect(searchDictionary(words, "てすと").map((e) => e.id)).toEqual([
      "b",
      "a",
    ]);
  });

  it("빈 찾기는 아무것도 내지 않는다", () => {
    expect(searchDictionary(list, "  ")).toEqual([]);
  });
});

describe("findSentenceCue", () => {
  const segments = [
    { start: 0, end: 2, text: "첫 문장입니다.", lang: "ko" as const },
    { start: 3, end: 5, text: "やまにいきます", lang: "ja" as const },
    { start: 6, end: 8, text: "やまにいきません", lang: "ja" as const },
  ];

  it("문장부호·가타카나 차이를 넘어 그 문장이 읽히는 구간을 찾는다", () => {
    expect(findSentenceCue(segments, "ヤマにいきます。")).toEqual({
      start: 3,
      end: 5,
    });
  });

  it("긍정·부정이 뒤집힌 구간과는 짝짓지 않는다", () => {
    expect(
      findSentenceCue(
        segments.slice(0, 1).concat(segments[2]),
        "やまにいきます",
      ),
    ).toBeNull();
  });
});
