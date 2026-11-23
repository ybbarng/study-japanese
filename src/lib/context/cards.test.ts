import { describe, expect, it } from "vitest";
import {
  buildCards,
  type CardSource,
  candidateForms,
  findWords,
} from "./cards";

// 교재 문장이 아니라 모양만 같은 가짜 문장을 쓴다(저장소 규칙)

const source: CardSource = {
  sentences: [
    { ja: "山は高い。", ko: "산은 높아." },
    { ja: "山は高い。", ko: "산은 높아.", speaker: "A" },
    { ja: "山", ko: "산", reading: "やま" },
    { ja: "うん。今日は山へ行く。", ko: "응. 오늘은 산에 가." },
  ],
  glossary: { 山: "やま", 今日: "きょう", 高い: "たかい" },
  words: [
    { ja: "山", reading: "やま", ko: "산" },
    { ja: "今日", reading: "きょう", ko: "오늘" },
    { ja: "は", ko: "는" },
  ],
};

const ja = (text: string) => ({ text, lang: "ja" as const });
const ko = (text: string) => ({ text, lang: "ko" as const });

describe("소책자 문장 카드", () => {
  it("일본어 구간을 맞춘 소책자 문장과 읽는 법·뜻으로 카드를 만든다", () => {
    const cards = buildCards([ko("설명"), ja("山は高い")], source);
    expect(Object.keys(cards)).toEqual(["1"]);
    expect(cards["1"].sentences).toEqual([
      {
        ja: "山は高い。",
        ko: "산은 높아.",
        ruby: [
          { text: "山", reading: "やま" },
          { text: "は" },
          { text: "高", reading: "たか" },
          { text: "い。" },
        ],
      },
    ]);
    expect(cards["1"].whole).toBe(true);
  });

  it("단어 코너 낱말은 그 낱말의 읽는 법을 달고, 낱말 칸에 다시 두지 않는다", () => {
    const card = buildCards([ja("山")], source)["0"];
    expect(card.sentences[0].ruby).toEqual([{ text: "山", reading: "やま" }]);
    expect(card.words).toEqual([]);
  });

  it("가나로 받아 적은 구간도 읽는 법으로 맞춘다", () => {
    expect(buildCards([ja("やまはたかい")], source)["0"].sentences[0].ja).toBe(
      "山は高い。",
    );
  });

  it("한 항목 속 긴 문장 하나만 읽어도 그 항목을 띄운다", () => {
    expect(
      buildCards([ja("今日は山へ行く")], source)["0"].sentences[0].ko,
    ).toBe("응. 오늘은 산에 가.");
  });

  it("일부 조각만 맞추면 whole이 false이고 못 맞춘 조각의 낱말을 찾는다", () => {
    const card = buildCards(
      [ja("山は高い。今日はまったくべつのはなし。")],
      source,
    )["0"];
    expect(card.whole).toBe(false);
    expect(card.sentences.map((s) => s.ja)).toEqual(["山は高い。"]);
    expect(card.words.map((w) => w.ja)).toEqual(["山", "今日"]);
  });

  it("맞춘 문장도 아는 낱말도 없으면 카드를 두지 않는다", () => {
    expect(buildCards([ja("まったくべつのはなし")], source)).toEqual({});
  });

  it("한국어 구간에는 카드를 두지 않는다", () => {
    expect(buildCards([ko("山は高い")], source)).toEqual({});
  });
});

describe("비교용 글", () => {
  it("문장이 여럿인 항목은 충분히 긴 조각을 따로 둔다(짧은 맞장구는 빼고)", () => {
    expect(
      candidateForms({ ja: "うん。今日は山へ行く。", ko: "" }, (t) => t),
    ).toEqual(["うん今日は山へ行く", "今日は山へ行く"]);
  });
});

describe("낱말 찾기", () => {
  it("앞에서부터 가장 긴 낱말을 찾고, 한 글자 가나 낱말은 띄우지 않는다", () => {
    const words = [
      { ja: "山", ko: "산" },
      { ja: "山道", ko: "산길" },
      { ja: "は", ko: "는" },
    ];
    expect(findWords("山道は山", words).map((w) => w.ja)).toEqual([
      "山道",
      "山",
    ]);
  });

  it("같은 낱말은 한 번만", () => {
    expect(findWords("山と山", [{ ja: "山", ko: "산" }])).toHaveLength(1);
  });
});
