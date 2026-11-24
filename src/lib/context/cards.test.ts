import { describe, expect, it } from "vitest";
import { wordPictureId } from "@/lib/pictures";
import {
  buildCards,
  type CardSource,
  candidateForms,
  findWords,
  heardLineWorthShowing,
  wordLineMatcher,
} from "./cards";
import { EMOJI } from "./emoji";

// 교재 문장이 아니라 모양만 같은 가짜 문장을 쓴다(저장소 규칙)

const source: CardSource = {
  sentences: [
    { ja: "山は高い。", ko: "산은 높아." },
    { ja: "山は高い。", ko: "산은 높아.", speaker: "A" },
    { ja: "山", ko: "산", reading: "やま" },
    { ja: "うん。今日は山へ行く。", ko: "응. 오늘은 산에 가." },
  ],
  glossary: { 山: "やま", 今日: "きょう", 高い: "たかい" },
  words: [
    { ja: "山", reading: "やま", ko: "산" },
    { ja: "今日", reading: "きょう", ko: "오늘" },
    { ja: "は", ko: "는" },
  ],
};

const ja = (text: string) => ({ text, lang: "ja" as const });
const ko = (text: string) => ({ text, lang: "ko" as const });

describe("낱말 하나만 있는 줄", () => {
  const words = [
    { ja: "山", reading: "やま", ko: "산" },
    { ja: "高い", reading: "たかい", ko: "높다" },
    { ja: "雨", reading: "あめ", ko: "비" },
  ];
  const lineWord = wordLineMatcher(words, [words[2]]);

  it("표기가 낱말 하나면 그 낱말", () => {
    expect(lineWord("山。")?.ja).toBe("山");
  });

  it("세 글자 이상 읽는 법으로 적은 줄도 그 낱말", () => {
    expect(lineWord("たかい")?.ja).toBe("高い");
  });

  it("두 글자 읽는 법은 익히는 낱말일 때만, 가타카나로 적었으면 보지 않는다", () => {
    expect(lineWord("あめ")?.ja).toBe("雨");
    expect(lineWord("アメ")).toBeNull();
    expect(lineWord("やま")).toBeNull();
  });

  it("낱말에 조사가 붙은 줄은 낱말 줄이 아니다(조사가 사라지지 않게)", () => {
    expect(lineWord("山が")).toBeNull();
  });

  it("낱말 줄은 받아쓰기 대신 낱말 카드(구간 전체)로 보인다", () => {
    const card = buildCards([ja("たかい")], {
      sentences: [],
      glossary: {},
      words,
    })["0"];
    expect(card.whole).toBe(true);
    expect(card.sentences.map((s) => [s.ja, s.ko])).toEqual([["高い", "높다"]]);
  });
});

describe("소책자 문장 카드", () => {
  it("일본어 구간을 맞춘 소책자 문장과 읽는 법·뜻으로 카드를 만든다", () => {
    const cards = buildCards([ko("설명"), ja("山は高い")], source);
    expect(Object.keys(cards)).toEqual(["1"]);
    expect(cards["1"].sentences).toEqual([
      {
        ja: "山は高い。",
        ko: "산은 높아.",
        ruby: [
          { text: "山", reading: "やま" },
          { text: "は" },
          { text: "高", reading: "たか" },
          { text: "い。" },
        ],
      },
    ]);
    expect(cards["1"].whole).toBe(true);
  });

  it("단어 코너 낱말은 그 낱말의 읽는 법을 달고, 낱말 칸에 다시 두지 않는다", () => {
    const card = buildCards([ja("山")], source)["0"];
    expect(card.sentences[0].ruby).toEqual([{ text: "山", reading: "やま" }]);
    expect(card.words).toEqual([]);
  });

  it("짧은 맞장구가 앞에 붙은 줄도 통째로 맞춰 구간 전체 카드로 만든다", () => {
    const card = buildCards([ja("うん。今日は山へ行く")], source)["0"];
    expect(card.whole).toBe(true);
    expect(card.sentences.map((s) => s.ja)).toEqual(["うん。今日は山へ行く。"]);
  });

  it("가나로 받아 적은 구간도 읽는 법으로 맞춘다", () => {
    expect(buildCards([ja("やまはたかい")], source)["0"].sentences[0].ja).toBe(
      "山は高い。",
    );
  });

  it("한 항목 속 긴 문장 하나만 읽어도 그 항목을 띄운다", () => {
    expect(
      buildCards([ja("今日は山へ行く")], source)["0"].sentences[0].ko,
    ).toBe("응. 오늘은 산에 가.");
  });

  it("일부 조각만 맞추면 whole이 false이고 못 맞춘 조각의 낱말을 찾는다", () => {
    const card = buildCards(
      [ja("山は高い。今日はまったくべつのはなし。")],
      source,
    )["0"];
    expect(card.whole).toBe(false);
    expect(card.sentences.map((s) => s.ja)).toEqual(["山は高い。"]);
    expect(card.words.map((w) => w.ja)).toEqual(["山", "今日"]);
  });

  it("구체적인 낱말 카드에는 그림을 붙이고, 그림이 없는 낱말은 그대로 둔다", () => {
    const card = buildCards([ja("山は高い。意味はまったくべつのはなし。")], {
      ...source,
      words: [...source.words, { ja: "意味", reading: "いみ", ko: "뜻" }],
    })["0"];
    expect(card.words).toEqual([
      { ja: "山", reading: "やま", ko: "산", picture: "mountain" },
      { ja: "意味", reading: "いみ", ko: "뜻" },
    ]);
  });

  it("그린 그림이 없는 낱말에는 그림 문자를 붙인다", () => {
    // 그림이 늘어도 깨지지 않게, 그린 그림이 없는 그림 문자 낱말을 골라 본다
    const word = Object.keys(EMOJI).find(
      (w) => [...w].length >= 2 && !wordPictureId(w),
    ) as string;
    const card = buildCards([ja(`${word}はまったくべつのはなし。`)], {
      ...source,
      words: [{ ja: word, ko: "뜻" }],
    })["0"];
    expect(card.words).toEqual([{ ja: word, ko: "뜻", emoji: EMOJI[word] }]);
  });

  it("그린 그림이 있는 낱말에는 그림 문자 대신 그림 id를 붙인다", () => {
    const card = buildCards([ja("傘はどこ")], {
      ...source,
      words: [{ ja: "傘", reading: "かさ", ko: "우산" }],
    })["0"];
    expect(card.words).toEqual([
      { ja: "傘", reading: "かさ", ko: "우산", picture: "m01-umbrella" },
    ]);
  });

  it("맞춘 문장도 아는 낱말도 없으면 카드를 두지 않는다", () => {
    expect(buildCards([ja("まったくべつのはなし")], source)).toEqual({});
  });

  it("한국어 구간에는 카드를 두지 않는다", () => {
    expect(buildCards([ko("山は高い")], source)).toEqual({});
  });

  it("소책자 문장 카드에는 출처 필드를 두지 않는다(일무따 카드가 그대로)", () => {
    expect(buildCards([ja("山は高い")], source)["0"]).not.toHaveProperty(
      "origin",
    );
  });
});

describe("받아 적은 글 카드", () => {
  const fromTranscript: CardSource = { ...source, origin: "transcript" };

  it("자막 짝으로 맞춘 문장 카드는 출처를 transcript로 표시한다", () => {
    expect(buildCards([ja("山は高い")], fromTranscript)["0"].origin).toBe(
      "transcript",
    );
  });

  it("문장 없이 낱말만 붙은 카드는 출처를 표시하지 않는다", () => {
    const card = buildCards([ja("今日のはなし")], fromTranscript)["0"];
    expect(card.sentences).toEqual([]);
    expect(card).not.toHaveProperty("origin");
  });
});

describe("비교용 글", () => {
  it("문장이 여럿인 항목은 충분히 긴 조각을 따로 둔다(짧은 맞장구는 빼고)", () => {
    expect(
      candidateForms({ ja: "うん。今日は山へ行く。", ko: "" }, (t) => t),
    ).toEqual(["うん今日は山へ行く", "今日は山へ行く"]);
  });
});

describe("낱말 찾기", () => {
  it("앞에서부터 가장 긴 낱말을 찾고, 한 글자 가나 낱말은 띄우지 않는다", () => {
    const words = [
      { ja: "山", ko: "산" },
      { ja: "山道", ko: "산길" },
      { ja: "は", ko: "는" },
    ];
    expect(findWords("山道は山", words).map((w) => w.ja)).toEqual([
      "山道",
      "山",
    ]);
  });

  it("같은 낱말은 한 번만", () => {
    expect(findWords("山と山", [{ ja: "山", ko: "산" }])).toHaveLength(1);
  });
});

describe("받아 적은 글로 만든 카드의 읽는 법·낱말 칩", () => {
  const sentence = {
    ja: "花子は花瓶を下さった。",
    ko: "하나코는 꽃병을 주셨다.",
  };
  const base = {
    sentences: [sentence],
    glossary: {
      花: "はな",
      子: "こ",
      花瓶: "かびん",
      下: "した",
      下さ: "くださ",
    },
    words: [
      { ja: "花", reading: "はな", ko: "꽃" },
      { ja: "子", reading: "こ", ko: "아이" },
      { ja: "花瓶", reading: "かびん", ko: "꽃병" },
      { ja: "下", reading: "した", ko: "아래" },
    ],
  };

  it("이름 속 한자·높임 동사 앞부분에는 낱말 칩과 틀린 읽기를 달지 않는다", () => {
    const card = buildCards([ja(sentence.ja)], {
      ...base,
      origin: "transcript",
    })["0"];
    expect(card?.words.map((w) => w.ja)).toEqual(["花瓶"]);
    expect(card?.sentences[0]?.ruby.filter((r) => r.reading)).toEqual([
      { text: "花瓶", reading: "かびん" },
      { text: "下", reading: "くだ" },
    ]);
  });

  it("소책자 문장 카드는 예전처럼 사전 낱말을 모두 찾는다(확인 모드는 받아 적은 글만)", () => {
    const card = buildCards([ja(sentence.ja)], base)["0"];
    expect(card?.words.map((w) => w.ja)).toEqual(["花", "子", "花瓶", "下"]);
  });

  it("소책자 카드라도 맞추지 못한 받아쓰기 조각의 낱말은 자리가 확인된 것만 단다", () => {
    const card = buildCards([ja("花子は来なかった")], base)["0"];
    expect(card).toBeUndefined();
  });
});

describe("활용한 꼴로 찾는 낱말 칩", () => {
  const eat = { ja: "食べる", reading: "たべる", ko: "먹다" };
  const inflected = [
    { form: "食べました", word: eat },
    { form: "食べ", word: eat },
  ];

  it("받아 적은 글(엄격)에서는 활용한 꼴이 나오면 사전형 칩을 단다", () => {
    expect(findWords("朝ご飯を食べました", [], 6, true, inflected)).toEqual([
      eat,
    ]);
  });

  it("낱말 목록에 같은 낱말이 있으면 활용한 꼴의 칩은 목록 쪽 뜻(모은 뜻)을 쓴다", () => {
    const listed = { ...eat, ko: "먹다, 마시다" };
    expect(
      findWords("朝ご飯を食べました", [listed], 6, true, inflected),
    ).toEqual([listed]);
  });

  it("엄격하지 않으면 활용한 꼴을 보지 않는다", () => {
    expect(findWords("朝ご飯を食べました", [], 6, false, inflected)).toEqual(
      [],
    );
  });

  it("활용한 꼴도 뒤에 한자가 붙으면(합성어) 그 낱말로 보지 않는다", () => {
    expect(findWords("食べ物が好き", [], 6, true, inflected)).toEqual([]);
  });
});

describe("원문이 없는 오디오의 받아 적은 줄", () => {
  const heard: CardSource = {
    sentences: [],
    glossary: {},
    words: [{ ja: "今日", reading: "きょう", ko: "오늘" }],
    noBookText: true,
  };

  it("낱말이 확인된 줄은 받아 적은 글(뜻 없음)로 표시하고 칩을 단다", () => {
    const card = buildCards([ja("今日はいい天気")], heard)["0"];
    expect(card).toMatchObject({ noBookText: true, sentences: [] });
    expect(card.words.map((w) => w.ja)).toEqual(["今日"]);
  });

  it("낱말이 없어도 히라가나가 든 긴 문장 꼴이면 받아 적은 글로 표시한다", () => {
    expect(buildCards([ja("それはとてもいいです")], heard)["0"]).toEqual({
      sentences: [],
      whole: false,
      words: [],
      noBookText: true,
    });
  });

  it("짧은 소리나 가타카나만인 줄은 흐린 받아쓰기로 둔다", () => {
    expect(buildCards([ja("さあ。"), ja("イル")], heard)).toEqual({});
  });

  it("원문이 있는 오디오에서는 표시하지 않는다", () => {
    const card = buildCards([ja("今日はいい天気")], {
      ...heard,
      noBookText: false,
    })["0"];
    expect(card.noBookText).toBeUndefined();
  });
});

describe("받아 적은 줄로 볼 만한가", () => {
  it("낱말이 있으면 짧아도 받는다", () => {
    expect(heardLineWorthShowing("山", [{ ja: "山", ko: "산" }])).toBe(true);
  });

  it("낱말이 없으면 여섯 글자 이상이고 히라가나가 있어야 한다", () => {
    expect(heardLineWorthShowing("それはいいです", [])).toBe(true);
    expect(heardLineWorthShowing("いいです", [])).toBe(false);
    expect(heardLineWorthShowing("アイウエオカキ", [])).toBe(false);
  });
});
