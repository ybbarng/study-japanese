import { describe, expect, it } from "vitest";
import { rubyFromReading } from "./reading-ruby";

// 가짜 문장(교재 글이 아니다)

describe("문장 읽는 법을 한자 덩어리마다 나눠 달기", () => {
  it("가나 부분을 닻으로 한자 덩어리의 읽기를 가른다", () => {
    expect(rubyFromReading("山のカメラ。", "やまのかめら", {})).toEqual([
      { text: "山", reading: "やま" },
      { text: "のカメラ。" },
    ]);
  });

  it("한자 덩어리가 여럿이어도 사이에 가나가 있으면 가른다", () => {
    expect(rubyFromReading("山へ川を見た", "やまへかわをみた", {})).toEqual([
      { text: "山", reading: "やま" },
      { text: "へ" },
      { text: "川", reading: "かわ" },
      { text: "を" },
      { text: "見", reading: "み" },
      { text: "た" },
    ]);
  });

  it("가나 없이 붙은 한자 덩어리 둘은 낱말 표에 읽기가 있을 때만 가른다", () => {
    expect(rubyFromReading("山、川だ", "やまかわだ", { 山: "やま" })).toEqual([
      { text: "山", reading: "やま" },
      { text: "、" },
      { text: "川", reading: "かわ" },
      { text: "だ" },
    ]);
    // 낱말 표에 없으면 어디서 끊을지 몰라 읽는 법을 달지 않는다
    expect(rubyFromReading("山、川だ", "やまかわだ", {})).toEqual([
      { text: "山、川だ" },
    ]);
  });

  it("읽는 법이 가나 부분과 어긋나면 달지 않는다", () => {
    expect(rubyFromReading("山のカメラ", "やまがかめら", {})).toEqual([
      { text: "山のカメラ" },
    ]);
  });

  it("낱말 표의 한 글자 읽기가 뒤 가나와 맞지 않으면(上げる의 上) 문장 읽기를 따른다", () => {
    expect(
      rubyFromReading("値を上げる", "あたいをあげる", { 上: "うえ" }),
    ).toEqual([
      { text: "値", reading: "あたい" },
      { text: "を" },
      { text: "上", reading: "あ" },
      { text: "げる" },
    ]);
  });

  it("닻 가나가 한자 읽기 안에도 있어 가르는 자리가 여럿이면 문장 읽기를 쓰지 않는다", () => {
    // 「が」가 数学(すうがく) 읽기 안에도 있어 すう|くがにがて로도 갈린다
    expect(rubyFromReading("数学が苦手", "すうがくがにがて", {})).toEqual([
      { text: "数学が苦手" },
    ]);
  });

  it("숫자는 읽기를 달지 않고 건너뛰되, 가나를 닻으로 나머지 한자에는 단다", () => {
    expect(rubyFromReading("3つの山を見た", "みっつのやまをみた", {})).toEqual([
      { text: "3つの" },
      { text: "山", reading: "やま" },
      { text: "を" },
      { text: "見", reading: "み" },
      { text: "た" },
    ]);
  });

  it("숫자 읽기를 빼고 남은 가나를 숫자 바로 뒤 한자에 단다", () => {
    expect(rubyFromReading("3本の山", "さんぼんのやま", {})).toEqual([
      { text: "3" },
      { text: "本", reading: "ぼん" },
      { text: "の" },
      { text: "山", reading: "やま" },
    ]);
  });

  it("숫자의 여러 소리 가운데 맞는 것으로 뒤 한자 읽기를 정한다(7 しち, 10 じゅっ, 3 みっ)", () => {
    const at = (text: string, reading: string, kanji: string) =>
      rubyFromReading(text, reading, {}).find((s) => s.text === kanji)?.reading;
    expect(at("7時に寝る", "しちじにねる", "時")).toBe("じ");
    expect(at("10分だけ", "じゅっぷんだけ", "分")).toBe("ぷん");
    expect(at("3日ほど", "みっかほど", "日")).toBe("か");
    expect(at("1万8000円だ", "いちまんはっせんえんだ", "円")).toBe("えん");
    expect(at("18,000円だ", "いちまんはっせんえんだ", "円")).toBe("えん");
  });

  it("숫자를 통째로 읽는 말(1人 ひとり)은 뒤 한자 읽기를 하나로 못 정하니 달지 않는다", () => {
    expect(rubyFromReading("1人で山へ", "ひとりでやまへ", {})).toEqual([
      { text: "1人で" },
      { text: "山", reading: "やま" },
      { text: "へ" },
    ]);
  });

  it("통째로 읽는 숫자 말이 있어도 같은 문장의 다른 숫자 뒤 한자에는 단다", () => {
    expect(
      rubyFromReading("1人に2本", "ひとりににほん", {}).find(
        (s) => s.text === "本",
      )?.reading,
    ).toBe("ほん");
  });
});

describe("문장 읽기가 있으면 낱말 표 읽기로 틀린 읽기를 달지 않는다", () => {
  it("낱말 표의 활용형 읽기(入れます いれます)가 문장 읽기와 다르면 문장 읽기를 따른다", () => {
    expect(
      rubyFromReading("店に入れます", "みせにはいれます", {
        入れます: "いれます",
      }),
    ).toEqual([
      { text: "店", reading: "みせ" },
      { text: "に" },
      { text: "入", reading: "はい" },
      { text: "れます" },
    ]);
  });

  it("낱말 표의 다른 활용 읽기(空く あく)가 문장 읽기와 다르면 문장 읽기를 따른다", () => {
    expect(rubyFromReading("腹が空く", "はらがすく", { 空く: "あく" })).toEqual(
      [
        { text: "腹", reading: "はら" },
        { text: "が" },
        { text: "空", reading: "す" },
        { text: "く" },
      ],
    );
  });

  it("낱말 표의 한 글자 읽기(時 じ)가 부호 앞이라도 문장 읽기와 다르면 문장 읽기를 따른다", () => {
    // 부호만 사이에 둔 時、花는 가를 자리를 뒤 낱말(花 はな) 읽기로 정한다
    expect(
      rubyFromReading("あの時、花が咲く", "あのときはながさく", {
        時: "じ",
        花: "はな",
      }),
    ).toEqual([
      { text: "あの" },
      { text: "時", reading: "とき" },
      { text: "、" },
      { text: "花", reading: "はな" },
      { text: "が" },
      { text: "咲", reading: "さ" },
      { text: "く" },
    ]);
  });

  it("문장 읽기가 글의 가나와 맞지 않으면 낱말 표로 되돌아가지 않고 비운다", () => {
    expect(
      rubyFromReading("山のカメラ", "やまがかめら", { 山: "やま" }),
    ).toEqual([{ text: "山のカメラ" }]);
  });
});

describe("가르는 자리가 여럿일 때", () => {
  it("낱말 표 읽기로 한쪽이 확정되면 그 갈래를 고른다", () => {
    // 「が」가 大学(だいがく) 읽기 안에도 있어 だい|くがにがて로도 갈린다
    expect(
      rubyFromReading("大学が苦手だ", "だいがくがにがてだ", { 苦手: "にがて" }),
    ).toEqual([
      { text: "大学", reading: "だいがく" },
      { text: "が" },
      { text: "苦手", reading: "にがて" },
      { text: "だ" },
    ]);
  });

  it("한자 읽기 첫 글자로 올 수 없는 가나(ん·っ)로 시작하는 갈래는 버린다", () => {
    // 海岸=かい, 近=んがち…는 近 읽기가 ん으로 시작하니 갈래가 아니다
    expect(rubyFromReading("海岸が近い", "かいがんがちかい", {})).toEqual([
      { text: "海岸", reading: "かいがん" },
      { text: "が" },
      { text: "近", reading: "ちか" },
      { text: "い" },
    ]);
  });

  it("낱말 둘에 걸친 한자 덩어리는 뒤 한자 읽기를 모르면 덩어리 읽기를 비운다", () => {
    // 今=いま가 앞과 맞고 着 뒤에 활용 꼬리(い)가 붙었다: 今着=いまつ 한 덩어리로 달지 않는다
    expect(rubyFromReading("今着いた", "いまついた", { 今: "いま" })).toEqual([
      { text: "今着いた" },
    ]);
  });

  it("낱말 둘에 걸친 한자 덩어리는 두 읽기를 모두 알면 나눠 단다", () => {
    expect(
      rubyFromReading("山川で", "やまかわで", { 山: "やま", 川: "かわ" }),
    ).toEqual([
      { text: "山", reading: "やま" },
      { text: "川", reading: "かわ" },
      { text: "で" },
    ]);
  });

  it("뒤에 조사가 붙은 합성어는 덩어리 읽기를 그대로 둔다", () => {
    expect(rubyFromReading("本屋に", "ほんやに", { 本: "ほん" })).toEqual([
      { text: "本屋", reading: "ほんや" },
      { text: "に" },
    ]);
  });

  it("덩어리 통째가 낱말 표에 있으면 활용 꼬리가 붙어도 덩어리 읽기를 둔다", () => {
    expect(
      rubyFromReading("今川くん", "いまがわくん", {
        今: "いま",
        今川: "いまがわ",
      }),
    ).toEqual([{ text: "今川", reading: "いまがわ" }, { text: "くん" }]);
  });

  it("읽는 법이 없으면 자리가 확인된 낱말의 읽기만 단다", () => {
    expect(rubyFromReading("山のカメラ", null, { 山: "やま" })).toEqual([
      { text: "山", reading: "やま" },
      { text: "のカメラ" },
    ]);
  });
});
