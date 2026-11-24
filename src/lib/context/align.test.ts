import { describe, expect, it } from "vitest";
import { undoubled, undoubledText } from "./align";
import { buildCards, type CardSource } from "./cards";

// 교재 문장이 아니라 모양만 같은 가짜 회화를 쓴다(저장소 규칙)

const conversation = [
  { ja: "タロウさん、山は好きですか。", ko: "타로 씨, 산 좋아해요?" },
  { ja: "ええ、好きです。", ko: "네, 좋아해요." },
  { ja: "じゃ、一緒に行きますか。", ko: "그럼 같이 갈래요?" },
  { ja: "ええ。いつ行きますか。", ko: "네. 언제 가요?" },
];

const source: CardSource = {
  sentences: conversation,
  ordered: conversation,
  glossary: { 山: "やま", 好: "す", 一緒: "いっしょ", 行: "い" },
  words: [],
};

const ja = (text: string) => ({ text, lang: "ja" as const });
const ko = (text: string) => ({ text, lang: "ko" as const });
const shown = (cards: ReturnType<typeof buildCards>, i: number) =>
  cards[String(i)]?.whole ? cards[String(i)].sentences.map((s) => s.ja) : null;

describe("예문 mp3를 읽는 차례로 맞추기", () => {
  it("두 문장을 붙여 받아 적은 줄을 앞뒤 닻 사이 문장 둘로 맞춘다", () => {
    const cards = buildCards(
      [
        ja("タロウさん。"),
        ja("山は好きですかええ好きです"),
        ja("じゃ、一緒に行きますか"),
      ],
      source,
    );
    expect(shown(cards, 1)).toEqual([conversation[0].ja, conversation[1].ja]);
  });

  it("쉼표 앞 조각만 받아 적은 줄도 그 문장으로 맞춘다", () => {
    const cards = buildCards(
      [ja("タロウさん。"), ja("山は好きですか"), ja("ええ、好きです。")],
      source,
    );
    expect(shown(cards, 0)).toEqual([conversation[0].ja]);
  });

  it("닻 사이에 든 짧은 맞장구는 그 문장 조각으로 맞춘다", () => {
    const cards = buildCards(
      [ja("じゃ、一緒に行きますか"), ja("ええ。"), ja("いつ行きますか")],
      source,
    );
    expect(shown(cards, 1)).toEqual([conversation[3].ja]);
  });

  it("되풀이 연습에서 같은 맞장구가 두 군데 있으면 닻에 가까운 조각을 고른다", () => {
    // 넷째 문장을 되풀이하는 사이라 창이 끝에서 처음으로 돌아 「ええ」가 둘째·넷째 문장 둘 다 든다
    const cards = buildCards(
      [ja("ええ。いつ行きますか"), ja("ええ。"), ja("ええ。いつ行きますか")],
      source,
    );
    expect(shown(cards, 1)).toEqual([conversation[3].ja]);
  });

  it("닻 사이 문장과 닮지 않은 줄은 맞추지 않는다", () => {
    const cards = buildCards(
      [
        ja("タロウさん、山は好きですか"),
        ja("ぬるぽがっ"),
        ja("ええ、好きです"),
      ],
      source,
    );
    expect(shown(cards, 1)).toBeNull();
  });

  it("읽는 차례가 없으면(강의) 낮춘 기준으로 맞추지 않는다", () => {
    const { ordered: _, ...lecture } = source;
    const cards = buildCards(
      [ja("タロウさん。"), ja("山は好きですかええ好きです")],
      lecture,
    );
    expect(shown(cards, 1)).toBeNull();
  });

  it("한국어 줄은 차례 맞추기에 쓰지 않는다", () => {
    const cards = buildCards([ko("타로 씨"), ja("ええ、好きです")], source);
    expect(cards["0"]).toBeUndefined();
  });
});

describe("한 줄에 두 번 받아 적은 말", () => {
  it("비교용 글이 같은 말 두 번이면 한 번만 남긴다", () => {
    expect(undoubled("やまだやまだ")).toBe("やまだ");
    expect(undoubled("やまだかわだ")).toBe("やまだかわだ");
  });

  it("원래 글에서는 빈칸 앞의 것만 남긴다", () => {
    expect(undoubledText("山が好きだ 山が好きだ")).toBe("山が好きだ");
    expect(undoubledText("山が好きだ 川が好きだ")).toBe(
      "山が好きだ 川が好きだ",
    );
  });
});
