import { describe, expect, it } from "vitest";
import { kanaPieces, sentencePieces } from "./pieces";

describe("kanaPieces", () => {
  it("요음은 두 글자를 한 박으로, 촉음은 표시로 나눈다", () => {
    expect(kanaPieces("きょうっ")).toEqual([
      { kind: "kana", text: "きょ", soundId: "kyo", script: "hira" },
      { kind: "kana", text: "う", soundId: "u", script: "hira" },
      { kind: "mark", text: "っ", mark: "sokuon", script: "hira" },
    ]);
  });

  it("장음 ー는 앞 글자가 가타카나면 가타카나 표시로 본다", () => {
    expect(kanaPieces("ケー")[1]).toEqual({
      kind: "mark",
      text: "ー",
      mark: "chouon",
      script: "kata",
    });
  });

  it("문장 부호는 부호로, 로마자는 모르는 글자로 남긴다", () => {
    expect(kanaPieces("あ、A。").map((p) => p.kind)).toEqual([
      "kana",
      "punct",
      "unknown",
      "punct",
    ]);
  });
});

describe("sentencePieces", () => {
  it("사전에 있는 한자 낱말은 읽는 법을 단 조각이 된다", () => {
    const pieces = sentencePieces("山だ", { 山: "やま" });
    expect(pieces[0]).toMatchObject({
      kind: "kanji",
      text: "山",
      reading: "やま",
    });
    expect(
      pieces[0].kind === "kanji" && pieces[0].units.map((u) => u.text),
    ).toEqual(["や", "ま"]);
    expect(pieces[1]).toMatchObject({ kind: "kana", text: "だ" });
  });

  it("사전에 없는 한자는 모르는 글자로 남는다", () => {
    expect(sentencePieces("川", {})).toEqual([{ kind: "unknown", text: "川" }]);
  });
});
