import { describe, expect, it } from "vitest";
import {
  joinWrappedKo,
  parseConversationSection,
  parseHeader,
  parseIlmutaBooklet,
  parsePatterns,
  parseWordColumns,
  parseWordItem,
} from "./ilmuta-booklet";

// 교재 글이 아니라 모양만 같게 지은 짧은 글이다.
const lesson = (no: string, title: string) => [
  no,
  "                                                 본책 010~015쪽",
  "",
  `       ${title}`,
  "                                                   반말",
  "                                                  고양이야.",
  "1단계 : 기본 단어 익히기                                 예문 01-2.mp3",
  "       猫[ねこ] 고양이                 犬[いぬ] 개",
  "       鳥[とり] 새                    魚[さかな] 물고기",
  "2단계 : 기본 문형 익히기                                 예문 01-3.mp3",
  "         1 ～だ。                                   ~야.",
  "       猫だ。                                    고양이야.",
  "       犬だ。                                    개야.",
  "         2 うん、～。                              응, ~야.",
  "",
  "           ううん、～じゃない。                    아니, ~가 아니야.",
  "       うん、鳥。                                응, 새야.",
  "                         003",
  "3단계 : 회화로 다지기                                            예문 01-4-1.mp3",
  "                                                         예문 01-4-2.mp3",
  "       단어",
  "       やあ 안녕                        本当[ほんとう] 정말",
  "       회화",
  "            山田 一郎 :   やあ。",
  "            パク・ミナ :    (손을 흔들며) 猫？",
  "            山田 一郎 :   うん、",
  "                         猫だ。",
  "         やまだ いちろう : 안녕.",
  "         박민아 : (손을 흔들며) 고양이야?",
  "         やまだ いちろう : 응,",
  "               고양이야.",
  "                                       005",
];

describe("parseIlmutaBooklet", () => {
  const text = [...lesson("01", "猫 。"), ...lesson("02", "犬だ。")].join("\n");
  const [first, second] = parseIlmutaBooklet(text);

  it("강 번호와 쪽수 표시로 강을 나눈다", () => {
    expect([first.no, second.no]).toEqual([1, 2]);
    expect(first.pages).toEqual({ from: 10, to: 15 });
  });

  it("강 머리에서 제목·뜻·반말 여부를 뽑는다", () => {
    expect(first.title).toBe("猫。");
    expect(first.titleKo).toBe("고양이야.");
    expect(first.register).toBe("casual");
  });

  it("단어는 왼쪽 단을 다 읽은 뒤 오른쪽 단을 읽는 차례로 둔다", () => {
    expect(first.words.map((w) => w.ja)).toEqual(["猫", "鳥", "犬", "魚"]);
    expect(first.words[0]).toEqual({ ja: "猫", reading: "ねこ", ko: "고양이" });
  });

  it("문형 머리와 그 아래 문장을 문형 번호로 잇는다", () => {
    expect(first.patterns).toEqual([
      { no: 1, ja: "～だ。", ko: "~야." },
      {
        no: 2,
        ja: "うん、～。 / ううん、～じゃない。",
        ko: "응, ~야. / 아니, ~가 아니야.",
      },
    ]);
    expect(first.patternSentences).toEqual([
      { ja: "猫だ。", ko: "고양이야.", pattern: 1 },
      { ja: "犬だ。", ko: "개야.", pattern: 1 },
      { ja: "うん、鳥。", ko: "응, 새야.", pattern: 2 },
    ]);
  });

  it("회화의 일본어 대사와 한국어 대사를 차례대로 짝짓고 한국어 지문은 일본어에서 뺀다", () => {
    expect(first.conversation).toEqual([
      { ja: "やあ。", ko: "안녕.", speaker: "山田 一郎" },
      { ja: "猫？", ko: "(손을 흔들며) 고양이야?", speaker: "パク・ミナ" },
      { ja: "うん、猫だ。", ko: "응, 고양이야.", speaker: "山田 一郎" },
    ]);
    expect(first.conversationWords.map((w) => w.ja)).toEqual(["やあ", "本当"]);
    expect(first.issues).toEqual([]);
  });
});

describe("parseConversationSection", () => {
  it("두 단 한국어 대사는 줄마다 왼쪽 → 오른쪽 차례로 읽고, 단 사이가 한 칸뿐이어도 이름에서 나눈다", () => {
    const result = parseConversationSection([
      "       회화",
      "            田中 :   行く？",
      "            キム :   うん。",
      "            田中 :   いつ？",
      "            キム :   明日。どう？",
      "            田中 :   いいよ。",
      "         たなか: 갈래?                   김: 응.",
      "         たなか: 언제? 김: 내일.",
      "                                         어때?",
      "         たなか: 좋아.",
    ]);
    expect(result.sentences.map((s) => [s.ja, s.ko])).toEqual([
      ["行く？", "갈래?"],
      ["うん。", "응."],
      ["いつ？", "언제?"],
      ["明日。どう？", "내일. 어때?"],
      ["いいよ。", "좋아."],
    ]);
  });

  it("줄을 넘는 지문 괄호가 있어도 일본어 대사로 본다", () => {
    const result = parseConversationSection([
      "       회화",
      "            田中 :   猫？ (사진을 보며 고양이를",
      "                      가리킨다) かわいい！",
      "         たなか : 고양이야? (사진을 보며 고양이를 가리킨다) 귀엽다!",
    ]);
    expect(result.sentences).toEqual([
      {
        ja: "猫？ かわいい！",
        ko: "고양이야? (사진을 보며 고양이를 가리킨다) 귀엽다!",
        speaker: "田中",
      },
    ]);
  });

  it("대사 수가 다르면 짝을 짓지 않고 까닭을 남긴다", () => {
    const result = parseConversationSection([
      "       회화",
      "            田中 :   行く？",
      "            キム :   うん。",
      "         たなか : 갈래?",
    ]);
    expect(result.sentences).toEqual([]);
    expect(result.issue).toBe("회화 대사 수가 맞지 않음(일본어 2, 한국어 1)");
  });
});

describe("parseWordItem", () => {
  it.each([
    ["猫[ねこ] 고양이", { ja: "猫", reading: "ねこ", ko: "고양이" }],
    ["走る[はしる] ⑤ 달리다", { ja: "走る", reading: "はしる", ko: "달리다" }],
    ["城[しろ] (일본식)성", { ja: "城", reading: "しろ", ko: "(일본식)성" }],
    [
      "東京城[とうきょうじょう] とうきょう성",
      { ja: "東京城", reading: "とうきょうじょう", ko: "とうきょう성" },
    ],
    ["パソコン PC", { ja: "パソコン", ko: "PC" }],
    ["～さん ~씨", { ja: "～さん", ko: "~씨" }],
    [
      "お願[ねが] いします 부탁합니다",
      { ja: "お願いします", ko: "부탁합니다" },
    ],
  ])("%s", (text, expected) => {
    expect(parseWordItem(text)).toEqual(expected);
  });

  it("한글이나 괄호 뜻으로 시작하면 앞 단어의 뜻이 넘어온 것으로 본다", () => {
    expect(parseWordItem("(높이는 말)")).toEqual({
      continuation: "(높이는 말)",
    });
    expect(parseWordItem("⑤ 먹다")).toEqual({ continuation: "먹다" });
  });
});

describe("parseWordColumns", () => {
  it("탭·제어 문자로 밀린 뜻과 넘어온 뜻을 제 단어에 붙인다", () => {
    const words = parseWordColumns([
      "       苦い[にがい]    쓰다, 맛이                魚[さかな] 물고기",
      "                            좋지 않다",
      "       犬[いぬ] 개                           鳥[とり] 새",
    ]);
    expect(words.map((w) => `${w.ja}=${w.ko}`)).toEqual([
      "苦い=쓰다, 맛이 좋지 않다",
      "犬=개",
      "魚=물고기",
      "鳥=새",
    ]);
  });

  it("줄을 넘은 읽는 법을 잇는다", () => {
    const words = parseWordColumns([
      "       お休みなさい[おやすみ                    猫[ねこ] 고양이",
      "       なさい] 잘 자요",
    ]);
    expect(words[0]).toEqual({
      ja: "お休みなさい",
      reading: "おやすみなさい",
      ko: "잘 자요",
    });
  });
});

describe("parsePatterns", () => {
  it("～ 없는 문형 머리와 둘째 줄을 들여쓰기로 가리고 활용형 표시는 뺀다", () => {
    const { patterns, sentences } = parsePatterns([
      "           1 来た。                                   왔어.",
      "                                                           た형",
      "            した。                                    했어.",
      "       猫が来た。                                 고양이가 왔어.",
      "       犬と猫を連れて来なかった。",
      "                                     개와 고양이를 안 데려왔어.",
    ]);
    expect(patterns).toEqual([
      { no: 1, ja: "来た。 / した。", ko: "왔어. / 했어." },
    ]);
    expect(sentences).toEqual([
      { ja: "猫が来た。", ko: "고양이가 왔어.", pattern: 1 },
      {
        ja: "犬と猫を連れて来なかった。",
        ko: "개와 고양이를 안 데려왔어.",
        pattern: 1,
      },
    ]);
  });
});

describe("parseHeader", () => {
  it("제목 위의 한국어는 부제로 두고, 줄이 넘어 잘린 존댓말 어미는 붙여 쓴다", () => {
    expect(
      parseHeader([
        "                                       끝소리가 く인 동사",
        "      猫が来ました。",
        "                                                              존댓말",
        "                                                             고양이가 왔습",
        "                                                             니다.",
      ]),
    ).toEqual({
      title: "猫が来ました。",
      titleKo: "고양이가 왔습니다.",
      subtitle: "끝소리가 く인 동사",
      register: "polite",
      pages: undefined,
    });
  });
});

describe("joinWrappedKo", () => {
  it("어미 조각만 붙이고 낱말 사이는 띄운다", () => {
    expect(joinWrappedKo(["역이 있습니", "까?"])).toBe("역이 있습니까?");
    expect(joinWrappedKo(["할 줄", "알아."])).toBe("할 줄 알아.");
  });
});
