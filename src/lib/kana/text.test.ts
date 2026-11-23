import { describe, expect, it } from "vitest";
import {
  isReadableWith,
  kanaToRomaji,
  requirementsOf,
  romajiToKana,
  sameKana,
  toHiragana,
  tokenize,
} from "./text";

describe("tokenize", () => {
  it("요음은 두 글자를 한 단위로 묶는다", () => {
    expect(tokenize("きょう").map((u) => u.text)).toEqual(["きょ", "う"]);
  });

  it("촉음·장음은 표시로 나눈다", () => {
    expect(tokenize("サッカー").map((u) => u.mark ?? u.soundId)).toEqual([
      "sa",
      "sokuon",
      "ka",
      "chouon",
    ]);
  });

  it("가나가 아닌 글자는 소리 없이 남긴다", () => {
    expect(tokenize("水")).toEqual([{ text: "水" }]);
  });
});

describe("requirementsOf / isReadableWith", () => {
  it("가타카나 낱말은 가타카나 카드를 요구한다", () => {
    expect(requirementsOf("ケーキ")).toEqual({
      cards: ["kata:ke", "kata:ki"],
      marks: ["chouon"],
      unknown: [],
    });
  });

  it("배우지 않은 글자가 하나라도 있으면 읽을 수 없다", () => {
    const learned = new Set(["hira:a", "hira:i"] as const);
    expect(isReadableWith("あい", learned, new Set())).toBe(true);
    expect(isReadableWith("あお", learned, new Set())).toBe(false);
  });

  it("촉음을 배우기 전에는 っ가 든 낱말을 읽을 수 없다", () => {
    const learned = new Set(["hira:ki", "hira:te"] as const);
    expect(isReadableWith("きって", learned, new Set())).toBe(false);
    expect(isReadableWith("きって", learned, new Set(["sokuon"]))).toBe(true);
  });
});

describe("romajiToKana", () => {
  it.each([
    ["sushi", "すし"],
    ["si", "し"],
    ["tsukue", "つくえ"],
    ["kitte", "きって"],
    ["kyou", "きょう"],
    ["honnwoyomu", "ほんをよむ"],
    ["sanpo", "さんぽ"],
    ["chotto", "ちょっと"],
    ["matcha", "まっちゃ"],
    ["xtu", "っ"],
  ])("%s → %s", (romaji, kana) => {
    expect(romajiToKana(romaji, "hira", true)).toBe(kana);
  });

  it("가타카나로 바꾸고 -는 ー가 된다", () => {
    expect(romajiToKana("ke-ki", "kata", true)).toBe("ケーキ");
    expect(romajiToKana("kafe", "kata", true)).toBe("カフェ");
    expect(romajiToKana("pa-thi-", "kata", true)).toBe("パーティー");
  });

  it("치는 중인 끝 로마자는 그대로 남긴다", () => {
    expect(romajiToKana("ky", "hira")).toBe("ky");
    expect(romajiToKana("hon", "hira")).toBe("ほn");
  });

  it("끝낼 때는 끝의 n도 ん으로 바꾼다", () => {
    expect(romajiToKana("hon", "hira", true)).toBe("ほん");
  });
});

describe("kanaToRomaji", () => {
  it("보기용은 헵번식으로 촉음 자음을 겹치고 장음 모음을 겹친다", () => {
    expect(kanaToRomaji("きって")).toBe("kitte");
    expect(kanaToRomaji("ちょっと")).toBe("chotto");
    expect(kanaToRomaji("ケーキ")).toBe("keeki");
    expect(kanaToRomaji("ほんをよむ")).toBe("honoyomu");
  });

  it("입력용은 입력기에서 그대로 칠 철자를 낸다", () => {
    expect(kanaToRomaji("ケーキ", true)).toBe("ke-ki");
    expect(kanaToRomaji("ほんをよむ", true)).toBe("honnwoyomu");
    expect(kanaToRomaji("にほん", true)).toBe("nihonn");
    expect(kanaToRomaji("さんぽ", true)).toBe("sannpo");
  });

  it("입력용 철자를 다시 가나로 바꾸면 원래 낱말이 된다", () => {
    for (const word of ["しゅくだい", "がっこう", "じゃあね", "まっちゃ"]) {
      expect(romajiToKana(kanaToRomaji(word, true), "hira", true)).toBe(word);
    }
    for (const word of ["パーティー", "ジェットコースター", "ハロウィン"]) {
      expect(romajiToKana(kanaToRomaji(word, true), "kata", true)).toBe(word);
    }
  });
});

describe("sameKana", () => {
  it("히라가나로 친 답도 가타카나 낱말과 같게 본다", () => {
    expect(sameKana("ぱん", "パン")).toBe(true);
    expect(toHiragana("ケーキ")).toBe("けーき");
  });

  it("다른 글자면 틀린다", () => {
    expect(sameKana("ぱん", "バン")).toBe(false);
  });
});
