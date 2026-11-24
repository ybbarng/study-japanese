import { describe, expect, it } from "vitest";
import type { CueCard } from "@/lib/context/cards";
import type { ContextCue } from "@/lib/context/cues";
import { buildDictionary, type DictInput, summarize } from "./entries";
import { searchDictionary } from "./search";
import {
  findExampleCue,
  findExampleCues,
  findSentenceCue,
} from "./sentence-cue";

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

  it("받아 적기가 한 문장을 두 구간으로 나눴으면 이어 붙여 찾는다", () => {
    const split = [
      { start: 1, end: 2, text: "あしたはやまに", lang: "ja" as const },
      { start: 2, end: 4, text: "いきます", lang: "ja" as const },
    ];
    expect(findSentenceCue(split, "あしたはやまにいきます。")).toEqual({
      start: 1,
      end: 4,
    });
  });
});

describe("findExampleCue", () => {
  const segments = [
    { start: 0, end: 2, text: "まったくちがうおと", lang: "ja" as const },
    { start: 3, end: 5, text: "べつのおと", lang: "ja" as const },
  ];
  const carded: ContextCue = {
    kind: "subtitle",
    start: 3,
    end: 5,
    text: "べつのおと",
    lang: "ja",
    card: {
      whole: true,
      sentences: [{ ja: "やまにいきます。", ko: "산에 갑니다." }],
      words: [],
    } as unknown as CueCard,
  };

  it("받아 적은 글이 틀려도 서버 카드가 그 문장과 맞춘 구간을 쓴다", () => {
    expect(findExampleCue([carded], segments, "やまにいきます")).toEqual({
      start: 3,
      end: 5,
    });
  });

  it("카드가 없으면 받아 적은 글로 찾고, 그것도 없으면 null", () => {
    expect(findExampleCue([], segments, "やまにいきます")).toBeNull();
  });
});

describe("findExampleCues", () => {
  // 역할 연습 회화 mp3처럼: 앞 절반은 A의 말만, 뒤 절반은 B의 말만 읽는다
  const dialogue = [
    { ja: "やまだ。", speaker: "A" },
    { ja: "かわだ。", speaker: "B" },
    { ja: "うみ？", speaker: "A" },
    { ja: "そらだね。", speaker: "B" },
    { ja: "はなもきれいだ。", speaker: "A" },
  ];
  const ja = (start: number, text: string) => ({
    start,
    end: start + 1,
    text,
    lang: "ja" as const,
  });
  const ko = (start: number, text: string) => ({
    start,
    end: start + 1,
    text,
    lang: "ko" as const,
  });

  it("짧은 대답을 한국어로 잘못 받아 적었으면 같은 화자의 앞뒤 문장 사이 줄을 쓴다", () => {
    const segments = [
      ja(0, "やまだ"),
      ko(3, "우미"), // A의 짧은 질문을 한국어로 받아 적었다
      ja(6, "はなもきれいだ"),
      ja(20, "かわだ"),
      ja(23, "そらだね"),
    ];
    expect(findExampleCues([], segments, dialogue)[2]).toEqual({
      start: 3,
      end: 4,
    });
  });

  it("다른 화자의 앞뒤 문장 사이(그 화자가 말하지 않는 빈자리)는 쓰지 않는다", () => {
    // B의 두 문장 사이(21~23초)는 A가 말할 빈자리라 줄이 없다. A 쪽에도 사이 줄이 없으면 null
    const segments = [
      ja(0, "やまだ"),
      ja(6, "はなもきれいだ"),
      ja(20, "かわだ"),
      ja(23, "そらだね"),
    ];
    expect(findExampleCues([], segments, dialogue)[2]).toBeNull();
  });

  it("두 화자가 번갈아 읽는 회화에서는 다른 화자 문장이 잡은 줄을 건너뛴다", () => {
    const segments = [
      ja(0, "やまだ"),
      ja(2, "かわだ"),
      ko(4, "우미"),
      ja(6, "そらだね"),
      ja(8, "はなもきれいだ"),
    ];
    expect(findExampleCues([], segments, dialogue)[2]).toEqual({
      start: 4,
      end: 5,
    });
  });

  it("화자가 없는 문형 예문은 사이 줄이 앞 문장의 뜻 풀이일 수 있어 채우지 않는다", () => {
    const patterns = dialogue.map(({ ja }) => ({ ja }));
    const segments = [
      ja(0, "やまだ"),
      ko(1.5, "산이다"), // 앞 문장의 뜻 풀이
      ko(3, "우미"),
      ja(6, "そらだね"),
    ];
    expect(findExampleCues([], segments, patterns)[2]).toBeNull();
  });

  it("같은 화자의 앞이나 뒤 문장 자리를 모르면 짐작하지 않는다", () => {
    const segments = [ko(3, "우미"), ja(6, "はなもきれいだ")];
    expect(findExampleCues([], segments, dialogue)[2]).toBeNull();
  });
});
