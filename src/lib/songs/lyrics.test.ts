import { describe, expect, it } from "vitest";
import { linesFromText, lyricsText, splitLyrics } from "./lyrics";

// 가사는 실제 노래가 아니라 모양만 같은 가짜 줄이다(공개 저장소).

describe("splitLyrics", () => {
  it("줄마다 앞뒤 공백(전각 공백 포함)을 지우고 빈 줄은 버린다", () => {
    expect(
      splitLyrics("  テストのうた\r\n\n　あめのひ　\n   \nおわり"),
    ).toEqual(["テストのうた", "あめのひ", "おわり"]);
  });

  it("줄 가운데 공백은 그대로 둔다", () => {
    expect(splitLyrics("あめ ふる")).toEqual(["あめ ふる"]);
  });
});

describe("lyricsText", () => {
  it("줄을 줄바꿈으로 잇는다", () => {
    expect(lyricsText([{ ja: "いち" }, { ja: "に" }])).toBe("いち\nに");
  });
});

describe("linesFromText", () => {
  const previous = [
    { ja: "いちばんめ", start: 1, note: "첫 줄 메모" },
    { ja: "にばんめ", start: 5 },
    { ja: "さんばんめ", start: 9 },
  ];

  it("글이 그대로인 줄은 시각·메모를 이어 받는다", () => {
    expect(linesFromText("いちばんめ\nにばんめ\nさんばんめ", previous)).toEqual(
      previous,
    );
  });

  it("줄을 하나 끼워 넣어도 뒤로 밀린 줄의 시각이 남고 새 줄은 비어 있다", () => {
    expect(
      linesFromText("いちばんめ\nあたらしい\nにばんめ\nさんばんめ", previous),
    ).toEqual([
      { ja: "いちばんめ", start: 1, note: "첫 줄 메모" },
      { ja: "あたらしい" },
      { ja: "にばんめ", start: 5 },
      { ja: "さんばんめ", start: 9 },
    ]);
  });

  it("고친 줄은 옛 시각을 버린다", () => {
    expect(
      linesFromText("いちばんめ\nにばんめ!\nさんばんめ", previous)[1],
    ).toEqual({
      ja: "にばんめ!",
    });
  });

  it("후렴처럼 같은 글이 두 번 나오면 옛 줄도 차례대로 하나씩 쓴다", () => {
    const chorus = [
      { ja: "くりかえし", start: 10 },
      { ja: "まんなか", start: 20 },
      { ja: "くりかえし", start: 30 },
    ];
    expect(
      linesFromText("くりかえし\nまんなか\nくりかえし", chorus).map(
        (l) => l.start,
      ),
    ).toEqual([10, 20, 30]);
  });

  it("같은 자리의 같은 글을 앞 줄이 가로채지 않는다", () => {
    const chorus = [
      { ja: "まえ", start: 1 },
      { ja: "くりかえし", start: 10 },
      { ja: "くりかえし", start: 30 },
    ];
    // 맨 앞 줄을 지우면 두 후렴은 그대로 자기 시각을 가진다
    expect(
      linesFromText("くりかえし\nくりかえし", chorus).map((l) => l.start),
    ).toEqual([10, 30]);
  });
});
