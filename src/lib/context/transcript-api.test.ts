import { describe, expect, it } from "vitest";
import {
  asTranscript,
  cardPictureIds,
  transcriptApiUrl,
} from "./transcript-api";

const segment = { start: 0, end: 1.5, text: "テストです。", lang: "ja" };
const base = { book: "ilmuta", item: "L01", kind: "lecture", durationSec: 3 };

describe("transcriptApiUrl", () => {
  it("책과 항목으로 자막 API 주소를 만든다", () => {
    expect(transcriptApiUrl("ilmunta", "E05-1")).toBe(
      "/api/transcripts/ilmunta/E05-1",
    );
  });
});

describe("asTranscript", () => {
  it("자막 꼴이면 받은 값을 그대로 돌려준다", () => {
    const t = { ...base, segments: [segment] };
    expect(asTranscript(t)).toBe(t);
  });

  it("구간의 언어가 ja·ko가 아니면 null", () => {
    expect(
      asTranscript({ ...base, segments: [{ ...segment, lang: "en" }] }),
    ).toBeNull();
  });

  it("서버가 null을 주면(자막 없음) null", () => {
    expect(asTranscript(null)).toBeNull();
  });

  it("segments가 배열이 아니면 null", () => {
    expect(asTranscript({ ...base, segments: "x" })).toBeNull();
  });
});

describe("cardPictureIds", () => {
  it("카드 낱말의 그림 id를 한 번씩만 모은다", () => {
    const word = (ja: string, picture?: string) => ({ ja, ko: "뜻", picture });
    const card = (words: ReturnType<typeof word>[]) => ({
      sentences: [],
      whole: false,
      words,
    });
    const t = {
      ...base,
      segments: [segment, segment],
      cards: {
        "0": card([word("傘", "m01-umbrella"), word("本")]),
        "1": card([word("傘", "m01-umbrella"), word("猫", "m02-cat")]),
      },
    };
    expect(cardPictureIds(t as never)).toEqual(["m01-umbrella", "m02-cat"]);
  });
});
