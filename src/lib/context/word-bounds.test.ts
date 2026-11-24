import { describe, expect, it } from "vitest";
import {
  counterFitsAt,
  kanjiCompounds,
  verifiedRubySegments,
  wordFitsAt,
} from "./word-bounds";

// 교재 문장이 아니라 모양만 같은 가짜 문장을 쓴다(저장소 규칙)

const fits = (text: string, form: string) =>
  wordFitsAt(text, text.indexOf(form), form);

describe("받아 적은 글 속 낱말 자리 확인", () => {
  it("한자 낱말 앞뒤에 다른 한자가 붙으면 더 긴 낱말(이름·합성어)의 일부로 보고 뺀다", () => {
    expect(fits("花子は来た", "花")).toBe(false);
    expect(fits("花子は来た", "子")).toBe(false);
    expect(fits("お父様が来た", "父")).toBe(false);
  });

  it("붙은 한자 덩어리가 두 글자 이상 아는 낱말로 빈틈없이 나뉘면 그 낱말들로 본다", () => {
    const compounds = kanjiCompounds(["日本", "料理", "運転", "手"]);
    const text = "日本料理を作る";
    expect(wordFitsAt(text, 0, "日本", compounds)).toBe(true);
    expect(wordFitsAt(text, 2, "料理", compounds)).toBe(true);
  });

  it("덩어리에 한 글자 낱말이 끼면(운전+手) 나누지 않는다", () => {
    const compounds = kanjiCompounds(["運転", "手"]);
    const text = "運転手が来た";
    expect(wordFitsAt(text, 0, "運転", compounds)).toBe(false);
    expect(wordFitsAt(text, 2, "手", compounds)).toBe(false);
  });

  it("한 글자 낱말 뒤 まで는 조사로 본다", () => {
    expect(fits("夜まで待つ", "夜")).toBe(true);
  });

  it("한자 낱말 뒤가 조사면 그 낱말로 본다", () => {
    expect(fits("花が咲いた", "花")).toBe(true);
    expect(fits("机の下に置く", "下")).toBe(true);
    expect(fits("山の上", "山")).toBe(true);
  });

  it("한 글자 한자 뒤에 조사가 아닌 히라가나가 오면 다른 낱말의 어간으로 본다", () => {
    expect(fits("本を下さった", "下")).toBe(false);
    expect(fits("友達と話す", "話")).toBe(false);
  });

  it("숫자 뒤 한 글자 한자는 세는 말로 보고 빼지만, 두 글자 낱말은 그대로", () => {
    expect(fits("3人で行く", "人")).toBe(false);
    expect(fits("1時間かかる", "時間")).toBe(true);
  });

  it("가타카나 낱말 앞뒤에 가타카나가 붙으면 더 긴 외래어의 일부로 보고 뺀다", () => {
    expect(fits("ウイスキーを飲む", "スキー")).toBe(false);
    expect(fits("スキーに行く", "スキー")).toBe(true);
  });

  it("히라가나 낱말은 줄 처음이나 조사 뒤면 그 낱말로 본다", () => {
    expect(fits("ちょっと待って", "ちょっと")).toBe(true);
    expect(fits("今日はちょっと寒い", "ちょっと")).toBe(true);
    expect(fits("山でちょっと休む", "ちょっと")).toBe(true);
  });

  it("히라가나 낱말 앞에 조사가 아닌 히라가나가 붙으면 다른 말의 일부로 보고 뺀다", () => {
    expect(fits("見えないくらい遠い", "いくら")).toBe(false);
  });

  it("동사 연용형 바로 뒤 한 글자 한자는 합성어의 뒷부분으로 보고 뺀다", () => {
    expect(fits("読み物が多い", "物")).toBe(false);
    expect(fits("考え事をする", "事")).toBe(false);
  });

  it("い형용사·조사 뒤 한 글자 한자는 그대로 본다", () => {
    expect(fits("赤い車がある", "車")).toBe(true);
    expect(fits("駅に車がある", "車")).toBe(true);
  });

  it("가타카나 바로 뒤 한 글자 한자는 접미사로 보고 뺀다", () => {
    expect(fits("ドイツ人が来た", "人")).toBe(false);
  });

  it("읽기가 둘로 갈리는 方는 받아 적은 글에서 달지 않는다", () => {
    expect(fits("この方が先生だ", "方")).toBe(false);
  });

  it("何는 を·が 앞에서만 그 낱말(なに)로 본다", () => {
    expect(fits("何を買う", "何")).toBe(true);
    expect(fits("何の本", "何")).toBe(false);
    expect(fits("何ですか", "何")).toBe(false);
  });
});

describe("세는 말 자리 확인", () => {
  const at = (text: string, form: string) => text.indexOf(form);

  it("뜻이 ~로 시작하는 한 글자 낱말은 수 바로 뒤에서만 그 낱말이다", () => {
    expect(
      counterFitsAt("その時は雨", at("その時は雨", "時"), "時", "~시"),
    ).toBe(false);
    expect(
      counterFitsAt("三時に行く", at("三時に行く", "時"), "時", "~시"),
    ).toBe(true);
  });

  it("세는 말이 아닌 낱말은 늘 통과한다", () => {
    expect(counterFitsAt("その本", 2, "本", "책")).toBe(true);
  });
});

describe("자리가 확인된 낱말에만 다는 읽는 법", () => {
  const glossary = { 下: "した", 下さ: "くださ", 花: "はな", 子: "こ" };

  it("높임 동사 앞부분은 한 글자 낱말보다 먼저 걸려 くだ로 읽는다", () => {
    expect(verifiedRubySegments("本を下さった", glossary)).toEqual([
      { text: "本を" },
      { text: "下", reading: "くだ" },
      { text: "さった" },
    ]);
  });

  it("이름처럼 붙은 한자에는 읽는 법을 달지 않는다", () => {
    expect(verifiedRubySegments("花子が来た", glossary)).toEqual([
      { text: "花子が来た" },
    ]);
  });

  it("홀로 쓴 낱말에는 읽는 법을 단다", () => {
    expect(verifiedRubySegments("花が下にある", glossary)).toEqual([
      { text: "花", reading: "はな" },
      { text: "が" },
      { text: "下", reading: "した" },
      { text: "にある" },
    ]);
  });
});
