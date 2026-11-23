import { describe, expect, it } from "vitest";
import { checkTranscript, SAME_RUN_LIMIT } from "./verify";

function transcript(
  segments: { start: number; end: number; text: string; lang?: string }[],
) {
  return {
    book: "ilmuta",
    item: "L99",
    kind: "lecture",
    durationSec: 100,
    segments: segments.map((s) => ({ lang: "ko", ...s })),
  };
}

describe("자막 파일 검사", () => {
  it("모양이 맞고 시각이 차례대로면 문제가 없다", () => {
    const c = checkTranscript(
      transcript([
        { start: 0, end: 1, text: "고양이" },
        { start: 1, end: 2, text: "ねこ", lang: "ja" },
      ]),
    );
    expect(c).toMatchObject({
      schemaOk: true,
      problems: [],
      empty: false,
      hallucination: false,
      ja: 1,
      ko: 1,
    });
  });

  it("언어가 ko·ja 밖이면 모양이 틀렸다고 한다", () => {
    const c = checkTranscript(
      transcript([{ start: 0, end: 1, text: "cat", lang: "en" }]),
    );
    expect(c.schemaOk).toBe(false);
  });

  it("시작이 앞 구간보다 이르거나 겹치면 시각 문제를 적는다", () => {
    const c = checkTranscript(
      transcript([
        { start: 5, end: 6, text: "가" },
        { start: 4, end: 7, text: "나" },
      ]),
    );
    expect(c.problems.filter((p) => p.startsWith("시각"))).toHaveLength(2);
  });

  it("구간이 없으면 비어 있다고 한다", () => {
    expect(checkTranscript(transcript([])).empty).toBe(true);
  });

  it(`같은 구간이 ${SAME_RUN_LIMIT}번 넘게 잇달아 나오면 환각으로 본다`, () => {
    const many = Array.from({ length: SAME_RUN_LIMIT + 1 }, (_, i) => ({
      start: i,
      end: i + 1,
      text: "회사",
    }));
    expect(checkTranscript(transcript(many)).hallucination).toBe(true);
    expect(
      checkTranscript(transcript(many.slice(0, SAME_RUN_LIMIT))).hallucination,
    ).toBe(false);
  });

  it("환각 문구가 든 구간이 있으면 환각으로 본다", () => {
    expect(
      checkTranscript(
        transcript([{ start: 0, end: 1, text: "한글자막 by 아무개" }]),
      ).hallucination,
    ).toBe(true);
  });
});
