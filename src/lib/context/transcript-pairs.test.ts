import { describe, expect, it } from "vitest";
import { betterTranscription, findRepeatPairs } from "./transcript-pairs";

// 교재 문장이 아니라 모양만 같은 가짜 문장을 쓴다(저장소 규칙)

let clock = 0;
function seg(lang: "ja" | "ko", text: string) {
  const start = clock;
  clock += 2;
  return { start, end: start + 1.5, text, lang };
}

describe("일본어 → 뜻 → 일본어 되풀이 짝", () => {
  it("같은 일본어 사이에 한국어 뜻이 끼면 짝 하나로, 시각은 첫 일본어 시작부터 둘째 끝까지", () => {
    clock = 0;
    const pairs = findRepeatPairs([
      seg("ko", "다음 예문입니다"),
      seg("ja", "猫が好きです。"),
      seg("ko", "고양이를 좋아합니다."),
      seg("ja", "猫が好きです。"),
    ]);
    expect(pairs).toEqual([
      {
        ja: "猫が好きです。",
        ko: "고양이를 좋아합니다.",
        start: 2,
        end: 7.5,
        score: 1,
      },
    ]);
  });

  it("두 일본어가 기준보다 덜 닮으면 짝으로 보지 않는다", () => {
    clock = 0;
    expect(
      findRepeatPairs([
        seg("ja", "猫が好きです。"),
        seg("ko", "고양이를 좋아합니다."),
        seg("ja", "犬を飼っています。"),
      ]),
    ).toEqual([]);
  });

  it("긍정과 부정이 뒤집힌 두 글은 글자가 닮아도 짝으로 보지 않는다", () => {
    clock = 0;
    expect(
      findRepeatPairs([
        seg("ja", "肉を食べます。"),
        seg("ko", "고기를 먹습니다."),
        seg("ja", "肉を食べません。"),
      ]),
    ).toEqual([]);
  });

  it("두 글자 이하 일본어(맞장구)는 짝으로 보지 않는다", () => {
    clock = 0;
    expect(
      findRepeatPairs([seg("ja", "はい"), seg("ko", "네"), seg("ja", "はい")]),
    ).toEqual([]);
  });

  it("짝을 만든 둘째 일본어를 다음 짝의 첫 일본어로 다시 쓰지 않는다", () => {
    clock = 0;
    const pairs = findRepeatPairs([
      seg("ja", "猫が好きです。"),
      seg("ko", "고양이를 좋아합니다."),
      seg("ja", "猫が好きです。"),
      seg("ko", "고양이를 좋아합니다."),
      seg("ja", "猫が好きです。"),
    ]);
    expect(pairs.map((p) => p.start)).toEqual([0]);
  });

  it("한 글자쯤 달리 받아 적은 짝은 더 나은 쪽 글을 고른다", () => {
    clock = 0;
    const [pair] = findRepeatPairs([
      seg("ja", "ねこがとても好きですよね。"),
      seg("ko", "고양이를 정말 좋아하지요."),
      seg("ja", "猫がとても好きですよね。"),
    ]);
    expect(pair.ja).toBe("猫がとても好きですよね。");
  });
});

describe("사이가 넓거나 나뉜 되풀이", () => {
  it("뜻을 두 번 읽어 한국어 줄이 둘 끼어도 짝으로 보고, 긴 한국어 줄을 뜻으로 쓴다", () => {
    clock = 0;
    const [pair] = findRepeatPairs([
      seg("ja", "猫が好きです。"),
      seg("ko", "고양이를 좋아합니다."),
      seg("ko", "어?"),
      seg("ja", "猫が好きです。"),
    ]);
    expect(pair.ko).toBe("고양이를 좋아합니다.");
  });

  it("한국어 줄이 넷 끼면 짝으로 보지 않는다", () => {
    clock = 0;
    expect(
      findRepeatPairs([
        seg("ja", "猫が好きです。"),
        seg("ko", "하나"),
        seg("ko", "둘"),
        seg("ko", "셋"),
        seg("ko", "넷"),
        seg("ja", "猫が好きです。"),
      ]),
    ).toEqual([]);
  });

  it("둘째 일본어가 두 줄로 나뉘어 받아 적혀도 이어서 견준다", () => {
    clock = 0;
    const [pair] = findRepeatPairs([
      seg("ja", "先週の土曜日に駅で友達に会った。"),
      seg("ko", "지난주 토요일에 역에서 친구를 만났다."),
      seg("ja", "先週の土曜日に"),
      seg("ja", "駅で友達に会った"),
    ]);
    expect(pair.ja).toBe("先週の土曜日に駅で友達に会った。");
  });

  it("뜻 판정 함수가 거절하면 뜻을 비운다", () => {
    clock = 0;
    const [pair] = findRepeatPairs(
      [
        seg("ja", "猫が好きです。"),
        seg("ko", "이렇게 말하면 되겠습니다"),
        seg("ja", "猫が好きです。"),
      ],
      { koIsMeaning: (_ja, ko) => !ko.includes("되겠") },
    );
    expect(pair).toMatchObject({ ja: "猫が好きです。", ko: "" });
  });
});

describe("두 받아 적기 중 더 나은 쪽", () => {
  it("한글·로마자가 섞인 쪽보다 섞이지 않은 쪽", () => {
    expect(betterTranscription("猫が好きですA", "ねこがすきです")).toBe(
      "ねこがすきです",
    );
  });

  it("한자가 더 많은 쪽", () => {
    expect(betterTranscription("ねこが好きです", "猫が好きです")).toBe(
      "猫が好きです",
    );
  });

  it("한자 수가 같으면 끝이 덜 잘린 긴 쪽", () => {
    expect(betterTranscription("猫が好きで", "猫が好きです")).toBe(
      "猫が好きです",
    );
  });
});
