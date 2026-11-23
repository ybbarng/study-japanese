import { describe, expect, it } from "vitest";
import {
  applyKo,
  koText,
  linesFromText,
  lyricsText,
  splitLyrics,
} from "./lyrics";

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

describe("해석 붙이기(koText·applyKo)", () => {
  const lines = [
    { ja: "いちばんめ", start: 1 },
    { ja: "にばんめ", ko: "옛 해석" },
  ];

  it("붙여 넣은 해석을 줄마다 붙이고, 빈 줄은 버리며 -는 해석 없음으로 둔다", () => {
    expect(applyKo(lines, "첫째 줄\n\n-\n")).toEqual({
      ok: true,
      lines: [
        { ja: "いちばんめ", start: 1, ko: "첫째 줄" },
        { ja: "にばんめ" },
      ],
    });
  });

  it("해석 칸이 비면 모든 줄의 해석을 지운다", () => {
    expect(applyKo(lines, "  \n")).toEqual({
      ok: true,
      lines: [{ ja: "いちばんめ", start: 1 }, { ja: "にばんめ" }],
    });
  });

  it("줄 수가 가사와 다르면 붙이지 않고 두 줄 수를 돌려준다", () => {
    expect(applyKo(lines, "하나\n둘\n셋")).toEqual({
      ok: false,
      lyricLines: 2,
      koLines: 3,
    });
  });

  it("고치기 칸에 다시 넣을 때 해석 없는 줄은 -로 적고, 해석이 하나도 없으면 빈 글", () => {
    expect(koText(lines)).toBe("-\n옛 해석");
    expect(koText([{ ja: "いち" }])).toBe("");
  });

  it("koText로 꺼낸 글을 다시 붙이면 해석이 그대로다", () => {
    const back = applyKo(lines, koText(lines));
    expect(back.ok && back.lines).toEqual(lines);
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
