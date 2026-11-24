import { describe, expect, it } from "vitest";
import {
  compact,
  hasRunawayRepeat,
  isKnownHallucination,
  isNoiseLine,
  isNonSpeech,
  isSuspectText,
  longestSameRun,
  withoutNoise,
} from "./hallucination";

describe("정해진 환각 문구", () => {
  it("자막 제작자·구독 인사 같은 문구를 알아본다", () => {
    expect(isKnownHallucination("한글자막 by 아무개")).toBe(true);
    expect(isKnownHallucination("チャンネル登録お願いします")).toBe(true);
    expect(isKnownHallucination("次の動画でお会いしましょう")).toBe(true);
  });

  it("평범한 강의 문장은 환각 문구가 아니다", () => {
    expect(isKnownHallucination("다음 시간에는 동사를 배워요")).toBe(false);
  });
});

describe("소리 표시", () => {
  it("음악·BGM 표시만 있는 글을 말이 아닌 것으로 본다", () => {
    expect(isNonSpeech("[音楽]")).toBe(true);
    expect(isNonSpeech("(음악)")).toBe(true);
    expect(isNonSpeech("BGM")).toBe(true);
    expect(isNonSpeech("♪")).toBe(true);
  });

  it("말이 든 글은 소리 표시가 아니다", () => {
    expect(isNonSpeech("音楽が好き")).toBe(false);
  });
});

describe("구간 안 되풀이", () => {
  it("짧은 말이 여섯 번 넘게 이어지면 되풀이로 본다", () => {
    expect(hasRunawayRepeat("「は」「は」「は」「は」「は」「は」")).toBe(true);
  });

  it("세 글자 넘는 말이 세 번 이어지면 되풀이로 본다", () => {
    expect(hasRunawayRepeat("ねこがいるねこがいるねこがいる")).toBe(true);
  });

  it("같은 낱말이 두 번 나오는 평범한 문장은 되풀이가 아니다", () => {
    expect(hasRunawayRepeat("모모는 모모야")).toBe(false);
    expect(hasRunawayRepeat("ううん、ねこじゃない")).toBe(false);
  });

  it("환각 의심은 문구·소리 표시·되풀이 가운데 하나라도 맞으면 참이다", () => {
    expect(isSuspectText("[音楽]")).toBe(true);
    expect(isSuspectText("ねこだ")).toBe(false);
  });
});

describe("자막을 내줄 때 거를 잡음 줄", () => {
  it("장음 기호·문장부호만 있는 줄을 거른다", () => {
    expect(isNoiseLine("ー")).toBe(true);
    expect(isNoiseLine("ーーー")).toBe(true);
    expect(isNoiseLine("…。")).toBe(true);
    expect(isNoiseLine("♪〜 ♪")).toBe(true);
    expect(isNoiseLine("  ")).toBe(true);
  });

  it("제작진 표기 줄을 거른다", () => {
    expect(isNoiseLine("作詞・作曲・編曲 아무개")).toBe(true);
    expect(isNoiseLine("作曲：なにがし")).toBe(true);
    expect(isNoiseLine("작사 아무개")).toBe(true);
    expect(isNoiseLine("Lyrics by Someone")).toBe(true);
  });

  it("영문 한 글자만 있는 줄을 거른다", () => {
    expect(isNoiseLine("E")).toBe(true);
    expect(isNoiseLine("E.")).toBe(true);
    expect(isNoiseLine(" G。")).toBe(true);
  });

  it("영문이 두 글자 넘거나 다른 글자와 함께 있으면 남긴다", () => {
    expect(isNoiseLine("OK")).toBe(false);
    expect(isNoiseLine("Tシャツ")).toBe(false);
    expect(isNoiseLine("A형")).toBe(false);
  });

  it("영문 한 글자에 장음 기호가 붙은 줄도 거른다", () => {
    expect(isNoiseLine("E ー")).toBe(true);
  });

  it("영문이 대부분인 줄(영어로 잘못 받아 적은 말)을 거른다", () => {
    expect(isNoiseLine("got it!")).toBe(true);
    expect(isNoiseLine("WARMING UP")).toBe(true);
    expect(isNoiseLine("in 。")).toBe(true);
  });

  it("줄임말만 있는 줄이나 일본어 문장 속 영문은 남긴다", () => {
    expect(isNoiseLine("DVD")).toBe(false);
    expect(isNoiseLine("DVDを借りません。")).toBe(false);
    expect(isNoiseLine("青い t シャツを買います")).toBe(false);
  });

  it("한글 낱자만 있는 줄을 거르고, 낱자가 섞인 한국어 문장은 남긴다", () => {
    expect(isNoiseLine("ㅇ,")).toBe(true);
    expect(isNoiseLine("ㄹ")).toBe(true);
    expect(isNoiseLine("ㅈ의 발음은 어렵습니다.")).toBe(false);
  });

  it("글자가 하나라도 있는 짧은 대답은 남긴다", () => {
    expect(isNoiseLine("え")).toBe(false);
    expect(isNoiseLine("はい。")).toBe(false);
    expect(isNoiseLine("ネ")).toBe(false);
    expect(isNoiseLine("응")).toBe(false);
    expect(isNoiseLine("3")).toBe(false);
    expect(isNoiseLine("ゴール！")).toBe(false);
  });

  it("문장 속 제작진 낱말은 남긴다", () => {
    expect(isNoiseLine("作曲家になりたいです")).toBe(false);
    expect(isNoiseLine("작곡했어요")).toBe(false);
  });

  it("잡음 줄만 빼고 나머지 구간은 차례대로 남긴다", () => {
    const segs = [
      seg(0, 1, "ー"),
      seg(1, 2, "ねこだ"),
      seg(2, 3, "作詞 아무개"),
    ];
    expect(withoutNoise(segs)).toEqual([seg(1, 2, "ねこだ")]);
  });
});

/** 시각 붙은 자막 구간 하나(가짜 글) */
function seg(start: number, end: number, text: string) {
  return { start, end, text };
}

describe("지어낸 되풀이 묶음", () => {
  it("같은 한 글자가 잇달아 나오고 길이 0인 구간이 끼면 묶음 전체를 뺀다", () => {
    const segs = [
      seg(0, 1, "ねこだ"),
      seg(7.0, 7.4, "木"),
      seg(7.4, 7.5, "木"),
      seg(7.5, 7.5, "木"),
      seg(7.5, 7.6, "木"),
      seg(8, 10, "고양이예요"),
    ];
    expect(withoutNoise(segs).map((s) => s.text)).toEqual([
      "ねこだ",
      "고양이예요",
    ]);
  });

  it("사람이 같은 낱말을 세 번 말한 반복 연습(구간마다 길이가 있음)은 남긴다", () => {
    const segs = [seg(0, 0.7, "木"), seg(0.8, 1.5, "木"), seg(1.6, 2.3, "木")];
    expect(withoutNoise(segs)).toHaveLength(3);
  });

  it("길이 0인 구간이 있어도 두 번만 나오면 묶음으로 보지 않는다", () => {
    const segs = [seg(0, 0.5, "え"), seg(0.5, 0.5, "え")];
    expect(withoutNoise(segs)).toHaveLength(2);
  });
});

describe("앞 줄 꼬리 조각", () => {
  it("앞 줄과 글이 같은 0.3초 미만 구간은 뺀다", () => {
    const segs = [seg(0, 1.5, "ねこがすきだ"), seg(1.5, 1.7, "ねこがすきだ。")];
    expect(withoutNoise(segs).map((s) => s.end)).toEqual([1.5]);
  });

  it("0.3초가 되는 구간은 남긴다", () => {
    const segs = [seg(0, 1.5, "ねこがすきだ"), seg(1.5, 1.8, "ねこがすきだ")];
    expect(withoutNoise(segs)).toHaveLength(2);
  });

  it("글이 다르면 짧아도 남긴다", () => {
    const segs = [seg(0, 1.5, "ねこがすきだ"), seg(1.5, 1.7, "いぬがすきだ")];
    expect(withoutNoise(segs)).toHaveLength(2);
  });

  it("두 글자 이하 대답은 짧게 되풀이해도 남긴다", () => {
    const segs = [seg(0, 0.25, "うん"), seg(0.3, 0.55, "うん")];
    expect(withoutNoise(segs)).toHaveLength(2);
  });
});

describe("같은 구간이 잇달아 나온 횟수", () => {
  it("부호·공백을 무시하고 가장 긴 연속을 센다", () => {
    const run = longestSameRun(["가", "나.", "나", " 나!", "가"]);
    expect(run.count).toBe(3);
    expect(compact(run.text)).toBe("나");
  });

  it("빈 목록은 0번이다", () => {
    expect(longestSameRun([]).count).toBe(0);
  });
});
