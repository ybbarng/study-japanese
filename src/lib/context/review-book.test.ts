import { describe, expect, it } from "vitest";
import { type CardSource, reviewedCard } from "./cards";
import { bookGroups } from "./review-book";

// 교재 문장이 아니라 모양만 같은 가짜 문장을 쓴다(저장소 규칙)

const booklet = [
  { ja: "山は高いですか。", ko: "산은 높아요?" },
  { ja: "ええ、高いですよ。川も見ますか。", ko: "네, 높아요. 강도 봐요?" },
  { ja: "今日は雨ですから、川へ行きます。", ko: "오늘은 비니까 강에 가요." },
];

describe("고친 글을 소책자 항목으로 덮기", () => {
  it("부호만 다른 항목 통째는 통째 묶음 하나다", () => {
    expect(bookGroups("山は高いですか", booklet)).toEqual([
      { start: 0, end: 7, sentence: booklet[0], whole: true },
    ]);
  });

  it("두 사람의 말을 이은 글은 항목이 바뀌는 자리에서 묶음이 나뉜다", () => {
    const text = "山は高いですか。ええ、高いですよ。川も見ますか。";
    expect(bookGroups(text, booklet)).toEqual([
      { start: 0, end: 8, sentence: booklet[0], whole: true },
      { start: 8, end: text.length, sentence: booklet[1], whole: true },
    ]);
  });

  it("항목 속 부호 사이 조각은 조각 묶음이다", () => {
    expect(bookGroups("今日は雨ですから、", booklet)).toEqual([
      { start: 0, end: 9, sentence: booklet[2], whole: false },
    ]);
  });

  it("소책자에 없는 글자가 섞이면 덮지 못한다", () => {
    expect(bookGroups("山は低いですか。", booklet)).toBeNull();
    // 부호 사이를 가르는 조각(「高いですか」만)은 항목 조각으로 보지 않는다
    expect(bookGroups("高いですか。", booklet)).toBeNull();
  });
});

describe("교정 카드를 소책자 문장과 견주어 보이기", () => {
  const source: CardSource = {
    sentences: booklet,
    glossary: { 山: "やま", 川: "かわ", 今日: "きょう", 明日: "あした" },
    words: [
      { ja: "山", reading: "やま", ko: "산" },
      { ja: "川", reading: "かわ", ko: "강" },
    ],
  };

  it("소책자 항목 통째와 같으면 교정 표시 없이 소책자 카드로 보인다", () => {
    const card = reviewedCard(
      "山は高いですか",
      "やまはたかいですか",
      "산은 높나요",
      source,
    );
    expect(card.reviewed).toBeUndefined();
    expect(card.origin).toBeUndefined();
    expect(card.sentences.map((s) => [s.ja, s.ko])).toEqual([
      ["山は高いですか。", "산은 높아요?"],
    ]);
  });

  it("두 사람의 말을 이은 글은 사람마다 문장을 나눠 소책자 뜻을 단다", () => {
    const card = reviewedCard(
      "山は高いですか。ええ、高いですよ。川も見ますか。",
      null,
      "산은 높아요? 네, 높아요. 강도 봐요?",
      source,
    );
    expect(card.sentences.map((s) => [s.ja, s.ko])).toEqual([
      ["山は高いですか。", "산은 높아요?"],
      ["ええ、高いですよ。川も見ますか。", "네, 높아요. 강도 봐요?"],
    ]);
  });

  it("항목 조각이 섞이면 '교재 문장과 같은 글'로 표시하고 뜻을 문장 수대로 나눈다", () => {
    const card = reviewedCard(
      "川へ行きます。山は高いですか。",
      "かわへいきますやまはたかいですか",
      "강에 가요. 산은 높나요?",
      source,
    );
    expect(card.reviewed).toBe(true);
    expect(card.bookText).toBe(true);
    expect(card.sentences.map((s) => [s.ja, s.ko])).toEqual([
      ["川へ行きます。", "강에 가요."],
      ["山は高いですか。", "산은 높아요?"],
    ]);
    // 조각 문장의 읽는 법은 교정 파일 읽기를 그 자리에서 자른 것
    expect(card.sentences[0].ruby[0]).toEqual({ text: "川", reading: "かわ" });
  });

  it("소책자와 다른 글은 고쳐 받아 적은 글 그대로다", () => {
    const card = reviewedCard("山は低いですか。", null, "산은 낮아요?", source);
    expect(card.reviewed).toBe(true);
    expect(card.bookText).toBeUndefined();
    expect(card.sentences.map((s) => s.ja)).toEqual(["山は低いですか。"]);
  });

  it("교정 파일의 chips가 낱말 칩 뜻을 그 줄 문맥의 뜻으로 바꾼다", () => {
    const card = reviewedCard(
      "山は低いですか。",
      null,
      "산은 낮아요?",
      source,
      {
        山: "산봉우리",
      },
    );
    expect(card.words).toContainEqual(
      expect.objectContaining({ ja: "山", ko: "산봉우리" }),
    );
  });
});
