import { describe, expect, it } from "vitest";
import { fakeExample, fakeLesson } from "@/lib/ilmuta/__fixtures__/lesson";
import {
  ilmuntaCardSource,
  ilmutaCardSource,
  inflectedWords,
  itemWithoutBookText,
  lessonNoOfItem,
  looksLikeMeaning,
  withAllMeanings,
} from "./card-sources";

describe("뜻이 여럿인 낱말의 칩", () => {
  it("같은 낱말이 다른 뜻으로 여러 번 있으면 하나로 합쳐 뜻을 모은다", () => {
    expect(
      withAllMeanings([
        { ja: "取る", reading: "とる", ko: "집다" },
        { ja: "山", reading: "やま", ko: "산" },
        { ja: "取る", reading: "とる", ko: "집다, 잡다" },
      ]),
    ).toEqual([
      { ja: "取る", reading: "とる", ko: "집다, 잡다" },
      { ja: "山", reading: "やま", ko: "산" },
    ]);
  });

  it("읽기가 다르면 다른 낱말로 둔다", () => {
    const words = [
      { ja: "方", reading: "かた", ko: "분" },
      { ja: "方", reading: "ほう", ko: "쪽" },
    ];
    expect(withAllMeanings(words)).toEqual(words);
  });
});

describe("소책자에 원문이 없는 예문 mp3", () => {
  it("일무따 연습 문제·장문과 일문따 읽기 글이다", () => {
    expect(itemWithoutBookText("ilmuta", "12-5")).toBe(true);
    expect(itemWithoutBookText("ilmuta", "40-6")).toBe(true);
    expect(itemWithoutBookText("ilmunta", "05-2")).toBe(true);
  });

  it("소책자 글이 있는 예문·강의는 아니다", () => {
    expect(itemWithoutBookText("ilmuta", "12-1")).toBe(false);
    expect(itemWithoutBookText("ilmuta", "12-4-1")).toBe(false);
    expect(itemWithoutBookText("ilmunta", "05-1")).toBe(false);
    expect(itemWithoutBookText("ilmuta", "L12")).toBe(false);
  });
});

describe("드릴 낱말의 활용한 꼴", () => {
  it("활용 엔진이 만든 꼴을 사전형 칩으로 잇고, 사전형과 같은 꼴은 두지 않는다", () => {
    const eat = inflectedWords((d) => d === "食べる");
    expect(eat.find((f) => f.form === "食べました")?.word).toEqual({
      ja: "食べる",
      reading: "たべる",
      ko: "먹다",
    });
    expect(eat.some((f) => f.form === "食べる")).toBe(false);
  });

  it("고른 낱말의 꼴만 낸다", () => {
    const dicts = new Set(
      inflectedWords((d) => d === "書く").map((f) => f.word.ja),
    );
    expect([...dicts]).toEqual(["書く"]);
  });
});

describe("강의 되풀이 사이 한국어 줄이 뜻인가", () => {
  it("일본어 문장을 옮긴 말이면 뜻으로 본다", () => {
    expect(looksLikeMeaning("猫が好きです。", "고양이를 좋아해요.")).toBe(true);
  });

  it("문형·차례를 설명하는 말투면 뜻으로 보지 않는다", () => {
    expect(looksLikeMeaning("猫が好きです。", "3번에서는 이렇게 말해요")).toBe(
      false,
    );
  });

  it("조사로 끝난 토막은 뜻으로 보지 않는다(말을 이어 가는 중)", () => {
    expect(looksLikeMeaning("食べさせる", "스루는")).toBe(false);
    expect(looksLikeMeaning("食べさせる", "먹게 하다")).toBe(true);
  });

  it("일본어보다 훨씬 긴 한국어 줄은 뜻으로 보지 않는다", () => {
    expect(
      looksLikeMeaning(
        "好き",
        "그러니까 좋아하는 것을 말할 때 쓰는 말인데 잘 기억해 두세요",
      ),
    ).toBe(false);
  });
});

describe("항목 이름에서 강·과 번호", () => {
  it.each([
    ["L10", 10],
    ["L10-01", 10],
    ["10-3", 10],
    ["07-4-1", 7],
  ])("%s → %d", (item, no) => {
    expect(lessonNoOfItem(item)).toBe(no);
  });

  it("모양이 다르면 null", () => {
    expect(lessonNoOfItem("extra")).toBeNull();
  });
});

describe("일무따 카드 재료", () => {
  const lessons = [
    fakeLesson(1),
    fakeLesson(2, {
      examples: [
        fakeExample("02-2", "words", {
          sentences: [{ ja: "川", ko: "강", reading: "かわ" }],
        }),
      ],
    }),
  ];

  it("그 강의 제목과 소책자 문장만 맞출 후보로 둔다", () => {
    // 강 제목은 예문 mp3 첫머리(기본 회화 듣기)와 강의에서 읽는다
    expect(ilmutaCardSource(lessons, 2).sentences.map((s) => s.ja)).toEqual([
      "テスト2。",
      "川",
    ]);
  });

  it("기본 회화 듣기 mp3는 강 제목 뒤에 회화를 읽는 차례로 맞춘다", () => {
    const withDialogue = [
      fakeLesson(3, {
        examples: [
          fakeExample("03-1", "dialogue"),
          fakeExample("03-4-1", "conversationBasic", {
            sentences: [
              { ja: "やあ。", ko: "안녕." },
              { ja: "うん。", ko: "응." },
            ],
          }),
        ],
      }),
    ];
    expect(
      ilmutaCardSource(withDialogue, 3, "03-1").ordered?.map((s) => s.ja),
    ).toEqual(["テスト3。", "やあ。", "うん。"]);
  });

  it("소책자에 글이 없는 예문(연습 문제)과 강의에는 읽는 차례가 없다", () => {
    const withExercise = [
      fakeLesson(4, { examples: [fakeExample("04-5", "exercise")] }),
    ];
    expect(ilmutaCardSource(withExercise, 4, "04-5").ordered).toBeUndefined();
    expect(ilmutaCardSource(withExercise, 4, "L04").ordered).toBeUndefined();
  });

  it("낱말과 읽는 법은 그 강까지 배운 단어로 단다", () => {
    const src = ilmutaCardSource(lessons, 2);
    expect(src.words.map((w) => w.ja)).toEqual(["山", "川"]);
    expect(src.glossary).toEqual({ 山: "やま", 川: "かわ" });
    expect(ilmutaCardSource(lessons, 1).words.map((w) => w.ja)).toEqual(["山"]);
  });
});

describe("일문따 카드 재료", () => {
  it("짝이 없으면 문장 후보는 비우고 드릴 낱말을 쓴다", () => {
    const src = ilmuntaCardSource(null);
    expect(src.sentences).toEqual([]);
    expect(src.words.length).toBeGreaterThan(50);
    expect(src.words.some((w) => w.ja === "山")).toBe(false);
  });

  it("자막에서 찾은 짝을 문장 후보로 쓰고 출처를 받아 적은 글로 둔다", () => {
    const src = ilmuntaCardSource(null, [
      {
        ja: "猫が好きです。",
        ko: "고양이를 좋아합니다.",
        start: 1,
        end: 6,
        score: 1,
      },
    ]);
    expect(src.sentences).toEqual([
      { ja: "猫が好きです。", ko: "고양이를 좋아합니다." },
    ]);
    expect(src.origin).toBe("transcript");
  });

  it("일무따를 볼 수 있으면 일무따 단어도 낱말로 쓴다", () => {
    const src = ilmuntaCardSource([fakeLesson(1)]);
    expect(src.words.find((w) => w.ja === "山")).toEqual({
      ja: "山",
      reading: "やま",
      ko: "산",
    });
    expect(src.glossary.山).toBe("やま");
  });
});
