import { describe, expect, it } from "vitest";
import { draftGrammar, placeTokens } from "./draft";

// 지어낸 문장
describe("placeTokens", () => {
  it("겉모양을 앞에서부터 차례로 찾아 위치를 붙이고 겉모양은 버린다", () => {
    expect(
      placeTokens("山は山だ。", [
        ["山", "名詞", "산", "やま"],
        ["は", "助詞", "~은/는"],
        ["山", "名詞", "산", "やま"],
      ]),
    ).toEqual({
      tokens: [
        { start: 0, length: 1, reading: "やま", pos: "名詞", gloss: "산" },
        { start: 1, length: 1, pos: "助詞", gloss: "~은/는" },
        { start: 2, length: 1, reading: "やま", pos: "名詞", gloss: "산" },
      ],
    });
  });

  it("건너뛴 글자(문장 부호)는 덮지 않는다", () => {
    const placed = placeTokens("うん、テスト。", [
      ["うん", "感動詞", "응"],
      ["テスト", "名詞", "시험"],
    ]);
    expect(placed).toEqual({
      tokens: [
        { start: 0, length: 2, pos: "感動詞", gloss: "응" },
        { start: 3, length: 3, pos: "名詞", gloss: "시험" },
      ],
    });
  });

  it("기본형이 겉모양과 같으면 적지 않는다", () => {
    const placed = placeTokens("見る", [
      ["見る", "動詞", "보다", "みる", "見る"],
    ]);
    expect(placed).toEqual({
      tokens: [
        { start: 0, length: 2, reading: "みる", pos: "動詞", gloss: "보다" },
      ],
    });
  });

  it("문장에 없거나 차례가 뒤바뀐 겉모양은 알린다", () => {
    expect(placeTokens("山は", [["川", "名詞", "강"]])).toEqual({
      notFound: "川",
    });
    expect(
      placeTokens("山は", [
        ["は", "助詞", ""],
        ["山", "名詞", ""],
      ]),
    ).toEqual({ notFound: "山" });
  });
});

describe("draftGrammar", () => {
  it("강 번호가 있으면 일무따 강 링크로 바꾼다", () => {
    expect(
      draftGrammar([
        ["〜だ", "~이다", 1],
        ["〜ね", "~네"],
      ]),
    ).toEqual([
      { pattern: "〜だ", explain: "~이다", ref: { book: "ilmuta", lesson: 1 } },
      { pattern: "〜ね", explain: "~네" },
    ]);
  });
});
