import { describe, expect, it } from "vitest";
import type { CueWord } from "./cards";
import { conjugatedForms } from "./conjugations";
import {
  echoOf,
  type FixedSegment,
  type Frame,
  fixedCards,
  pointingWordsOf,
  sentenceOfPart,
} from "./fixed-cards";

// 교재 글이 아니라 모양만 같은 가짜 틀·낱말·이름을 쓴다(저장소 규칙)

const ja = (text: string, start?: number): FixedSegment => ({
  text,
  lang: "ja",
  start,
});
const ko = (text: string, start?: number): FixedSegment => ({
  text,
  lang: "ko",
  start,
});
const asKana = (t: string) => t;

const hanako: CueWord = { ja: "花子", reading: "はなこ", ko: "하나코" };
const yama: CueWord = { ja: "山", reading: "やま", ko: "산" };
const frames: Frame[] = [
  { ja: "うん、～の。", ko: "응, ~(의) 꺼야." },
  { ja: "ううん、～のじゃない。", ko: "아니, ~(의) 꺼가 아니야." },
  { ja: "～じゃない。", ko: "~가 아니야." },
  { ja: "～なかった。", ko: "~하지 않았어." },
  { ja: "～。", ko: "~야." },
];

function cardsOf(
  segments: FixedSegment[],
  source = { frames, fillers: [hanako, yama] },
) {
  return fixedCards(segments, {}, source, asKana);
}

describe("맞장구·대답", () => {
  it("바로 뒤 한국어 줄이 「아니」로 시작하면 うん으로 적혀도 ううん으로 본다", () => {
    const cards = cardsOf([ja("うん。"), ko("아니, 하나코 꺼가 아니야.")]);
    expect(cards["0"].sentences[0]).toMatchObject({ ja: "ううん", ko: "아니" });
  });

  it("이웃이 말해 주지 않으면 받아 적은 うん 그대로", () => {
    const cards = cardsOf([ja("うん。")]);
    expect(cards["0"].sentences[0]).toMatchObject({ ja: "うん", ko: "응" });
  });

  it("머뭇거리는 소리(あのー)만 있는 줄은 정해 둔 뜻으로", () => {
    expect(cardsOf([ja("あのー…。")])["0"].sentences[0]).toMatchObject({
      ja: "あの",
      ko: "저어",
    });
  });

  it("ん 하나는 이웃이 가르쳐 주지 않으면 카드를 두지 않는다", () => {
    expect(cardsOf([ja("ん?")])["0"]).toBeUndefined();
  });

  it("8초 넘게 떨어진 한국어 줄은 이웃으로 보지 않는다", () => {
    expect(cardsOf([ja("ん?", 0), ko("아니요", 20)])["0"]).toBeUndefined();
  });
});

describe("문형 틀에 그 강 낱말·이름 채우기", () => {
  it("틀의 가나가 맞고 빈칸이 이름이면 이름을 채운 문장과 뜻, 받아쓰기 출처로", () => {
    const card = cardsOf([ja("はなこのじゃない。")])["0"];
    expect(card).toMatchObject({
      origin: "transcript",
      whole: true,
      sentences: [{ ja: "花子のじゃない。", ko: "하나코(의) 꺼가 아니야." }],
      words: [hanako],
    });
  });

  it("장음만 덧붙여 받아 적은 이름도 소리가 같으면 채운다", () => {
    const card = cardsOf([ja("ハナコーのじゃない")])["0"];
    expect(card?.sentences[0].ja).toBe("花子のじゃない。");
  });

  it("받침 있는 낱말 뒤의 조사를 바꾼다(~가 → 산이)", () => {
    const card = cardsOf([ja("やまじゃない")])["0"];
    expect(card?.sentences[0].ko).toBe("산이 아니야.");
  });

  it("쉼표로 이은 줄은 마디마다 알아보고 이어 붙인다", () => {
    const card = cardsOf([ja("あ、やまの")])["0"];
    expect(card?.sentences.map((s) => s.ja)).toEqual(["あ", "山の。"]);
  });

  it("빈칸이 어느 낱말과도 닮지 않으면 카드를 두지 않는다", () => {
    expect(cardsOf([ja("さくらのじゃない")])["0"]).toBeUndefined();
  });

  it("동사 틀(～なかった)의 빈칸에는 낱말을 채우지 않는다", () => {
    expect(cardsOf([ja("やまなかった")])["0"]).toBeUndefined();
  });

  it("고정 조각이 없는 틀(～。)로는 줄 전체를 낱말로 보지 않는다", () => {
    expect(cardsOf([ja("やま")])["0"]).toBeUndefined();
  });

  it("이미 문장을 통째 맞춘 줄은 건드리지 않는다", () => {
    const done = {
      "0": {
        sentences: [{ ja: "X", ko: "x", ruby: [{ text: "X" }] }],
        whole: true,
        words: [],
      },
    };
    const out = fixedCards([ja("うん")], done, {}, asKana);
    expect(out["0"]).toBe(done["0"]);
  });
});

describe("같은 과 예문 자막에 있는 줄", () => {
  const echoes = ["先週の土曜日に駅で友達に会った。", "猫が好きです。"];

  it("거의 같은 줄이 있으면 그 문장으로, 받아쓰기 출처로", () => {
    expect(echoOf("先週の土曜日に駅で友達と会った", echoes, asKana)).toBe(
      "先週の土曜日に駅で友達に会った。",
    );
  });

  it("긍정·부정이 다르면 닮아도 고르지 않는다", () => {
    expect(echoOf("猫が好きではないです", echoes, asKana)).toBeNull();
  });

  it("다섯 글자 미만 짧은 줄은 보지 않는다", () => {
    expect(echoOf("猫が好き", ["猫が好き"], asKana)).toBeNull();
  });
});

describe("드릴 활용형", () => {
  const conjugations = conjugatedForms();

  it("그 과에서 배우는 꼴과 읽기가 같으면 활용 예 카드(사전형 칩, 뜻·꼴 이름)", () => {
    const card = fixedCards(
      [ja("こさせられる")],
      {},
      { conjugations, lessonSkills: new Set(["verb:causativePassive:kuru"]) },
      asKana,
    )["0"];
    expect(card?.sentences[0].ja).toBe("来させられる");
    expect(card?.sentences[0].ko).toBe(
      "오다 · 사역수동형((억지로) ~하게 되다)",
    );
    expect(card?.words.map((w) => w.ja)).toEqual(["来る"]);
  });

  it("그 과 기술이 아닌 꼴이면 카드를 두지 않는다(잘린 받아쓰기일 수 있다)", () => {
    const card = fixedCards(
      [ja("こさせられる")],
      {},
      { conjugations, lessonSkills: new Set(["verb:nai:godan"]) },
      asKana,
    )["0"];
    expect(card).toBeUndefined();
  });

  it("읽기가 같은데 표기가 다른 꼴이 남으면(来ませんでした/着ませんでした) 고르지 않는다", () => {
    const card = fixedCards(
      [ja("きませんでした")],
      {},
      { conjugations },
      asKana,
    )["0"];
    expect(card).toBeUndefined();
  });
});

describe("지시어·의문사만으로 된 줄", () => {
  it("지시어를 늘어놓은 줄은 낱말마다 뜻을 붙인 카드", () => {
    const card = fixedCards([ja("これ、それ、あれ")], {}, {}, asKana)["0"];
    expect(card?.sentences).toEqual([
      {
        ja: "これ・それ・あれ",
        ko: "이것, 그것, 저것",
        ruby: [{ text: "これ・それ・あれ" }],
      },
    ]);
  });

  it("의문사 하나를 되풀이한 줄은 한 번만", () => {
    expect(pointingWordsOf("どのくらい?どのくらい?")).toEqual(["どのくらい"]);
  });

  it("의문사가 아닌 지시어 하나(머뭇거림일 수 있음)나 다른 말이 섞인 줄은 알아보지 않는다", () => {
    expect(pointingWordsOf("その…")).toBeNull();
    expect(pointingWordsOf("これは山です")).toBeNull();
  });
});

describe("한 문장을 두 줄로 나눠 읽은 반쪽 줄", () => {
  const sentences = [
    {
      ja: "雨が降ったら家で本を読みます。",
      ko: "비가 오면 집에서 책을 읽어요.",
    },
    { ja: "雨が降ったら出かけません。", ko: "비가 오면 나가지 않아요." },
    { ja: "猫が好きです。", ko: "" },
  ];
  const sentenceCard = (s: { ja: string; ko: string }) => ({
    sentences: [{ ja: s.ja, ko: s.ko, ruby: [{ text: s.ja }] }],
    whole: true,
    words: [],
  });

  it("반쪽 줄에 그 문장 전체와 뜻을 붙인다", () => {
    const card = fixedCards(
      [ja("家で本を読みます")],
      {},
      { sentences },
      asKana,
      sentenceCard,
    )["0"];
    expect(card?.sentences[0]?.ko).toBe("비가 오면 집에서 책을 읽어요.");
    expect(card?.inferred).toBe(true);
  });

  it("받아쓰기가 한 글자 달라도 그 문장의 일부로 본다", () => {
    expect(sentenceOfPart("家で本お読みます", sentences, asKana)?.ko).toBe(
      "비가 오면 집에서 책을 읽어요.",
    );
  });

  it("두 문장에 다 들어가는 반쪽(雨が降ったら)은 어느 것인지 몰라 고르지 않는다", () => {
    expect(sentenceOfPart("雨が降ったら", sentences, asKana)).toBeNull();
  });

  it("뜻이 없는 문장은 고르지 않는다", () => {
    expect(sentenceOfPart("猫が好きで", sentences, asKana)).toBeNull();
  });
});
