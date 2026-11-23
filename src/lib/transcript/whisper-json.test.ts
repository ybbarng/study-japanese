import { describe, expect, it } from "vitest";
import { NO_TOKENS, parseWhisperJson } from "./whisper-json";

describe("whisper-cli -ojf 결과 읽기", () => {
  it("감지 언어, 초 단위 구간, 특수 토큰을 뺀 로그 확률 평균을 뽑는다", () => {
    const r = parseWhisperJson({
      result: { language: "ja" },
      transcription: [
        {
          offsets: { from: 0, to: 1500 },
          text: " ねこだ",
          tokens: [
            { text: "[_BEG_]", p: 0.1 },
            { text: "ねこ", p: 1 },
            { text: "だ", p: Math.E ** -1 },
            { text: "[_TT_75]", p: 0.2 },
          ],
        },
      ],
    });
    expect(r.lang).toBe("ja");
    expect(r.segments).toEqual([{ start: 0, end: 1.5, text: "ねこだ" }]);
    expect(r.meanLogProb).toBeCloseTo(-0.5, 5);
  });

  it("빈 글 구간은 버리고, 토큰이 없으면 NO_TOKENS를 준다", () => {
    const r = parseWhisperJson({
      result: { language: "ko" },
      transcription: [
        { offsets: { from: 0, to: 300 }, text: "  ", tokens: [] },
      ],
    });
    expect(r.segments).toEqual([]);
    expect(r.meanLogProb).toBe(NO_TOKENS);
  });
});
