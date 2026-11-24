import { describe, expect, it } from "vitest";
import type { CueWord } from "./cards";
import { buildKoreanVocab } from "./korean-vocab";
import {
  jamoDistance,
  reconcileMeaning,
  repairMeaning,
  typoDistance,
} from "./meaning";

// 교재 문장이 아니라 모양만 같은 가짜 뜻을 쓴다(저장소 규칙)

const word = (ja: string, ko: string): CueWord => ({ ja, ko });

describe("자모 차이", () => {
  it("모음 하나, 받침 하나 다른 말은 1", () => {
    expect(jamoDistance("선물", "산물")).toBe(1);
    expect(jamoDistance("사과", "사관")).toBe(1);
  });

  it("길이가 다르면 비교하지 않는다(무한)", () => {
    expect(jamoDistance("사과", "사과나무")).toBe(Number.POSITIVE_INFINITY);
  });
});

describe("받아 적은 뜻의 오타 바로잡기", () => {
  it("문장에 든 낱말 뜻과 자모 하나 다른 말을 낱말 뜻으로 바꾼다", () => {
    expect(
      repairMeaning("어제 산물을 받았다.", [word("プレゼント", "선물")]),
    ).toBe("어제 선물을 받았다.");
  });

  it("바꾼 말의 받침에 맞게 뒤 조사를 고친다", () => {
    expect(repairMeaning("그 사관은 빨갛다.", [word("りんご", "사과")])).toBe(
      "그 사과는 빨갛다.",
    );
  });

  it("낱말 뜻이 이미 있으면 그대로 둔다", () => {
    expect(repairMeaning("선물을 받았다.", [word("プレゼント", "선물")])).toBe(
      "선물을 받았다.",
    );
  });

  it("조사가 줄어 붙은 대명사(누가)·합성어(아드+님)는 오타로 보지 않는다", () => {
    expect(repairMeaning("누가 왔어?", [word("誰", "누구")])).toBe(
      "누가 왔어?",
    );
    expect(repairMeaning("아드님은 학생이다.", [word("息子", "아들")])).toBe(
      "아드님은 학생이다.",
    );
  });

  it("동사·명사형 서술어 뜻(~다·~임)은 활용해서 모양이 바뀌므로 쓰지 않는다", () => {
    expect(repairMeaning("날씨가 맑으면 간다.", [word("晴れ", "맑음")])).toBe(
      "날씨가 맑으면 간다.",
    );
    expect(repairMeaning("물을 마셔요.", [word("飲む", "마시다")])).toBe(
      "물을 마셔요.",
    );
  });

  it("이름 뒤에 씨가 붙은 말은 낱말 뜻과 자모 하나 달라도 바꾸지 않는다", () => {
    expect(repairMeaning("나리 씨가 왔다.", [word("梨", "나라")])).toBe(
      "나리 씨가 왔다.",
    );
  });
});

describe("같은 뜻을 따로 받아 적은 카드 뜻과 강사 줄 맞추기", () => {
  // 카드 뜻(예문 mp3에서 받아 적음)과 강사 줄(강의에서 받아 적음)이 낱말 하나만 다르다.
  // 점검 5차에서 카드가 틀린 쪽이었던 13곳의 꼴을 가짜 문장으로 옮겼다.
  const ctx = (ja: string, words: CueWord[] = []) => ({ ja, words });

  it("문장 속 동사 뜻을 품은 강사 줄의 말로 카드 뜻을 바로잡는다(닦게/닫게)", () => {
    const out = reconcileMeaning(
      "형은 나에게 창문을 닫게 했다.",
      "형은 나에게 창문을 닦게 했다.",
      ctx("兄は私に窓を磨かせた。", [word("磨く", "닦다")]),
    );
    expect(out.card).toBe("형은 나에게 창문을 닦게 했다.");
  });

  it("문장 속 낱말 뜻(소고기·와이셔츠·스티커·점심)을 품은 쪽으로 카드 뜻을 바로잡는다", () => {
    const cases: [string, string, CueWord][] = [
      ["수고기를 먹었다.", "소고기를 먹었다.", word("牛肉", "소고기")],
      [
        "이 와이셔트는 비싸다.",
        "이 와이셔츠는 비싸다.",
        word("ワイシャツ", "와이셔츠"),
      ],
      ["스테커를 샀어.", "스티커를 샀어.", word("ステッカー", "스티커")],
      ["잠심쯤 비가 왔어.", "점심쯤 비가 왔어.", word("昼", "점심")],
    ];
    for (const [card, line, w] of cases)
      expect(reconcileMeaning(card, line, ctx("…", [w])).card).toBe(line);
  });

  it("문장 속 이름 뜻을 품은 쪽으로 이름을 바로잡는다(파카다/타카다, 파니/타니)", () => {
    const out = reconcileMeaning(
      "파카다 씨에게 전해 줘.",
      "타카다 씨에게 전해 줘.",
      ctx("高田さんに伝えて。", [word("高田", "타카다(사람 이름)")]),
    );
    expect(out.card).toBe("타카다 씨에게 전해 줘.");
  });

  it("일본어에 없는 숫자로 받아 적은 말은 숫자 없는 쪽을 따른다(2번 역/이번 역)", () => {
    const out = reconcileMeaning(
      "2번 역이 우리 역이에요.",
      "이번 역이 우리 역이에요.",
      ctx("今度の駅が私たちの駅です。"),
    );
    expect(out.card).toBe("이번 역이 우리 역이에요.");
  });

  it("일본어에 그 숫자가 있으면 숫자를 틀린 것으로 보지 않는다", () => {
    const out = reconcileMeaning(
      "하루에 3번 먹어요.",
      "하루에 세 번 먹어요.",
      ctx("一日に3回食べます。"),
    );
    expect(out).toEqual({
      card: "하루에 3번 먹어요.",
      line: "하루에 세 번 먹어요.",
    });
  });

  it("한글 낱자가 홀로 든 말은 받아쓰기가 지어낸 것이라 다른 쪽을 따른다(ㅈ의/츠의)", () => {
    const out = reconcileMeaning(
      "ㅈ의 소리는 어렵다.",
      "츠의 소리는 어렵다.",
      ctx("つの音は難しい。"),
    );
    expect(out.card).toBe("츠의 소리는 어렵다.");
  });

  it("카드가 맞고 강사 줄이 틀렸으면 강사 줄을 카드의 말로 바로잡는다(선물/산물)", () => {
    const out = reconcileMeaning(
      "선물은 책이었어.",
      "산물은 책이었어.",
      ctx("プレゼントは本だった。", [word("プレゼント", "선물")]),
    );
    expect(out).toEqual({ card: "선물은 책이었어.", line: "선물은 책이었어." });
  });

  it("어느 쪽이 맞는지 증거가 없으면 둘 다 그대로 둔다(지저분하되/지저분하대, 싫지/쉬지)", () => {
    for (const [card, line] of [
      ["그 방은 지저분하되.", "그 방은 지저분하대."],
      ["옛 직장은 쉬지 않았다.", "옛 직장은 싫지 않았다."],
      ["호시노시는 왔어.", "호시노 씨는 왔어."],
    ])
      expect(reconcileMeaning(card, line, ctx("…"))).toEqual({ card, line });
  });

  it("두 글이 한 낱말보다 더 다르면(바꿔 말함) 건드리지 않는다", () => {
    const card = "영화를 봅니다.";
    const line = "영화를 볼 겁니다.";
    expect(reconcileMeaning(card, line, ctx("映画を見ます。"))).toEqual({
      card,
      line,
    });
  });

  it("소책자 카드는 바꾸지 않고, 바른 글에 나오는 카드의 말로 강사 줄만 바로잡는다", () => {
    const vocab = buildKoreanVocab(["마나부의 우산이야."]);
    const out = reconcileMeaning(
      "마나부(의) 우산이야?",
      "만화부 우산이야?",
      { ja: "学の傘?", words: [], vocab },
      true,
    );
    expect(out).toEqual({
      card: "마나부(의) 우산이야?",
      line: "마나부 우산이야?",
    });
  });

  it("강사 줄 머리의 맞장구와 된소리 하나 차이는 같은 말로 본다", () => {
    const out = reconcileMeaning(
      "선물 거가 아니야.",
      "아니, 산물 꺼가 아니야.",
      ctx("プレゼントのじゃない。", [word("プレゼント", "선물")]),
    );
    expect(out.line).toBe("아니, 선물 꺼가 아니야.");
  });

  it("낱말장은 소책자 카드를 확인할 때만 쓴다(받아 적은 카드끼리는 우연히 맞는 말이 많다)", () => {
    const vocab = buildKoreanVocab(["수고했어요."]);
    const card = "소고기를 샀다.";
    const line = "수고기를 샀다.";
    expect(reconcileMeaning(card, line, { ja: "…", words: [], vocab })).toEqual(
      { card, line },
    );
  });
});

describe("받아쓰기 오타 거리", () => {
  it("숫자와 한글, 낱자와 음절이 바뀐 것은 1로 센다", () => {
    expect(typoDistance("2번", "이번")).toBe(1);
    expect(typoDistance("ㅈ의", "츠의")).toBe(1);
    expect(typoDistance("닦게", "닫게")).toBe(1);
  });
});
