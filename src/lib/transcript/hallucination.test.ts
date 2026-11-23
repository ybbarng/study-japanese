import { describe, expect, it } from "vitest";
import {
  compact,
  hasRunawayRepeat,
  isKnownHallucination,
  isNonSpeech,
  isSuspectText,
  longestSameRun,
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
