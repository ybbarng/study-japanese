import { describe, expect, it } from "vitest";
import { buildPrompt, isSafeReplacement, judge } from "./retranscribe-judge";

// 교재 문장을 옮기지 않으려고 모양만 비슷한 지어낸 문장을 쓴다
const plainKana = (t: string) => t;
const glossaryKana = (t: string) => t.replaceAll("公園", "こうえん");
const never = () => false;

describe("isSafeReplacement", () => {
  it("rejects a known whisper hallucination phrase", () => {
    expect(
      isSafeReplacement(
        "ご視聴ありがとうございました",
        "ごしちょうありがとうございました",
        2,
        plainKana,
      ),
    ).toBe(false);
  });

  it("rejects text with more Hangul than the original", () => {
    expect(
      isSafeReplacement("こうえん에いく", "こうえんにいく", 1.5, plainKana),
    ).toBe(false);
  });

  it("rejects text more than twice as long as the original", () => {
    expect(
      isSafeReplacement(
        "きのうはこうえんにいってともだちとあそんだ",
        "こうえん",
        3,
        plainKana,
      ),
    ).toBe(false);
  });

  it("accepts a same-length Japanese line", () => {
    expect(
      isSafeReplacement("こうえんにいく", "こうえんにいった", 1.5, plainKana),
    ).toBe(true);
  });
});

describe("judge", () => {
  it("takes the prompted text when it newly matches and the plain decode supports it", () => {
    const result = judge(
      {
        original: "こーえんに",
        prompted: "こうえんにいく",
        plain: "こうえんにいく",
        durationSec: 1.5,
      },
      (t) => t === "こうえんにいく",
      plainKana,
    );
    expect(result).toEqual({
      change: true,
      kind: "matched",
      text: "こうえんにいく",
    });
  });

  it("refuses a match that neither the plain decode nor the original supports", () => {
    const result = judge(
      {
        original: "まどをあける",
        prompted: "こうえんにいく",
        plain: "まどをあけた",
        durationSec: 1.5,
      },
      (t) => t === "こうえんにいく",
      plainKana,
    );
    expect(result).toEqual({ change: false, reason: "not-better" });
  });

  it("takes the prompted text when both new decodes agree and the original stands apart", () => {
    const result = judge(
      {
        original: "そうえんにかく",
        prompted: "こうえんにいく",
        plain: "こうえんにいく",
        durationSec: 1.5,
      },
      never,
      plainKana,
    );
    expect(result).toEqual({
      change: true,
      kind: "agreed",
      text: "こうえんにいく",
    });
  });

  it("fixes only the spelling when the reading is unchanged and both decodes use the kanji", () => {
    const result = judge(
      {
        original: "こうえんにいく",
        prompted: "公園にいく",
        plain: "公園にいく",
        durationSec: 1.5,
      },
      never,
      glossaryKana,
    );
    expect(result).toEqual({ change: true, kind: "kanji", text: "公園にいく" });
  });

  it("keeps the original when the new decodes disagree with each other", () => {
    const result = judge(
      {
        original: "こうえんにいく",
        prompted: "こうえんにいった",
        plain: "こうばんにいく",
        durationSec: 1.5,
      },
      never,
      plainKana,
    );
    expect(result).toEqual({ change: false, reason: "not-better" });
  });
});

describe("buildPrompt", () => {
  it("joins unique items with 、 and stops before the character limit", () => {
    expect(buildPrompt(["こうえん", "まど", "こうえん", "ともだち"], 9)).toBe(
      "こうえん、まど",
    );
  });
});
