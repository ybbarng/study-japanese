import { describe, expect, it } from "vitest";
import type { CueCard } from "./card-schema";
import {
  plainForm,
  prepareReview,
  promotable,
  promoteSegments,
  type ReviewLine,
  type TranscriptReview,
  transcriptReviewSchema,
} from "./review";

// 교재 글이 아니라 모양만 같은 가짜 문장을 쓴다(docs/standing-rules.md)

type Seg = { start: number; end: number; text: string; lang: "ko" | "ja" };
const ja = (start: number, end: number, text: string): Seg => ({
  start,
  end,
  text,
  lang: "ja",
});
const ko = (start: number, end: number, text: string): Seg => ({
  start,
  end,
  text,
  lang: "ko",
});

/** 소리 확인을 통과한 확신 높은 일본어 줄(prompt 없는 whisper도 고친 글에 더 가깝다) */
function line(over: Partial<ReviewLine> = {}): ReviewLine {
  return {
    start: 10,
    end: 12,
    original: "山野カメラ",
    corrected: "山のカメラ。",
    reading: "やまのかめら",
    ko: "산의 카메라",
    confidence: "high",
    kind: "japanese",
    audioVerified: true,
    audio: { simPlain: 0.95, simOriginal: 0.6, spellingOnly: false },
    ...over,
  };
}

function review(...lines: ReviewLine[]): TranscriptReview {
  return { book: "ilmuta", item: "L09", threshold: 0.85, lines };
}

describe("교정 줄 맞추기(지문)", () => {
  const segments = [ko(0, 8, "시험 설명입니다"), ja(10, 12, "山野カメラ")];

  it("시각과 원래 글이 맞는 줄은 일본어 후보가 된다", () => {
    const out = prepareReview(segments, review(line()));
    expect(out.candidates.map((c) => [c.start, c.end])).toEqual([[10, 12]]);
    expect(out.mismatched).toBe(0);
  });

  it("원래 글이 다르면(자막이 바뀌었으면) 쓰지 않는다", () => {
    const out = prepareReview(
      segments,
      review(line({ original: "山野カメラだ" })),
    );
    expect(out.candidates).toEqual([]);
    expect(out.mismatched).toBe(1);
  });

  it("원래 글을 옮기며 부호만 빠뜨렸으면 같은 구간으로 본다", () => {
    const out = prepareReview(
      [ja(10, 12, "山野カメラ。")],
      review(line({ original: "山野カメラ" })),
    );
    expect(out.mismatched).toBe(0);
    expect(out.candidates).toHaveLength(1);
  });

  it("시각이 다르면 쓰지 않는다", () => {
    const out = prepareReview(segments, review(line({ start: 10.2 })));
    expect(out.candidates).toEqual([]);
    expect(out.mismatched).toBe(1);
  });

  it("교정 파일이 없으면 자막을 그대로 돌려준다", () => {
    expect(prepareReview(segments, null).segments).toBe(segments);
  });
});

describe("한국어를 가나로 적은 줄(korean-noise)과 헛것(other)", () => {
  const segments = [ja(1, 2, "なあはむに"), ko(3, 4, "다음 설명")];

  it("고친 한국어 글이 있으면 한국어 줄로 돌린다", () => {
    const out = prepareReview(
      segments,
      review(
        line({
          start: 1,
          end: 2,
          original: "なあはむに",
          kind: "korean-noise",
          corrected: "나는 무니",
        }),
      ),
    );
    expect(out.segments).toEqual([
      ko(1, 2, "나는 무니"),
      ko(3, 4, "다음 설명"),
    ]);
    expect(out.korean).toBe(1);
  });

  it("고친 글이 없으면 일본어로 내주지 않고 숨긴다", () => {
    const out = prepareReview(
      segments,
      review(
        line({
          start: 1,
          end: 2,
          original: "なあはむに",
          kind: "korean-noise",
          corrected: "",
        }),
      ),
    );
    expect(out.segments).toEqual([ko(3, 4, "다음 설명")]);
    expect(out.korean).toBe(1);
    expect(out.candidates).toEqual([]);
  });

  const other = (corrected: string, end = 2) =>
    review(
      line({ start: 1, end, original: "なあはむに", kind: "other", corrected }),
    );

  it("자리말이 섞인 문형 설명(other)은 고친 글을 한국어 설명 줄로 보인다", () => {
    const out = prepareReview(segments, other("누구누구の뭐뭐"));
    expect(out.segments).toEqual([
      ko(1, 2, "누구누구の뭐뭐"),
      ko(3, 4, "다음 설명"),
    ]);
    expect(out.candidates).toEqual([]);
  });

  it("고친 글이 없는 other는 숨긴다", () => {
    const out = prepareReview(segments, other(""));
    expect(out.segments).toEqual([ko(3, 4, "다음 설명")]);
    expect(out.dropped).toBe(1);
  });

  it("0.3초 미만 조각인 other는 고친 글이 있어도 숨긴다", () => {
    const out = prepareReview(
      [ja(1, 1.2, "なあはむに"), ko(3, 4, "다음 설명")],
      other("누구누구の", 1.2),
    );
    expect(out.segments).toEqual([ko(3, 4, "다음 설명")]);
  });
});

describe("일본어 + 한국어 뒷말이 섞인 줄(splitAt)", () => {
  const segments = [ja(10, 12, "山のカメラかめらんで")];
  const mixed = { original: "山のカメラかめらんで", corrected: "山のカメラ" };

  it("일본어 부분 시각과 한국어 글이 있으면 둘로 나눈다", () => {
    const out = prepareReview(
      segments,
      review(line({ ...mixed, splitAt: 11.2, koreanPart: "카메라인데" })),
    );
    expect(out.segments).toEqual([
      ja(10, 11.2, "山のカメラ"),
      ko(11.2, 12, "카메라인데"),
    ]);
    expect(out.candidates.map((c) => [c.start, c.end])).toEqual([[10, 11.2]]);
  });

  it("한국어 글이 없으면 일본어 부분만 내준다", () => {
    const out = prepareReview(
      segments,
      review(line({ ...mixed, splitAt: 11.2 })),
    );
    expect(out.segments).toEqual([ja(10, 11.2, "山のカメラ")]);
  });

  it("일본어 부분 시각이 없으면 원래 줄 그대로 둔다(흐린 받아쓰기)", () => {
    const out = prepareReview(segments, review(line(mixed)));
    expect(out.segments).toEqual(segments);
  });

  it("구간 밖 시각은 쓰지 않는다", () => {
    const out = prepareReview(
      segments,
      review(line({ ...mixed, splitAt: 12 })),
    );
    expect(out.segments).toEqual(segments);
    expect(out.split).toBe(0);
  });
});

describe("한국어 앞말 + 일본어가 섞인 줄(japaneseSide: after)", () => {
  const segments = [ja(10, 12, "かめらは山のカメラ")];
  const mixed = { original: "かめらは山のカメラ", corrected: "山のカメラ" };

  it("일본어가 splitAt 뒤면 한국어 줄과 일본어 줄 차례로 나눈다", () => {
    const out = prepareReview(
      segments,
      review(
        line({
          ...mixed,
          splitAt: 10.8,
          japaneseSide: "after",
          koreanPart: "카메라는",
        }),
      ),
    );
    expect(out.segments).toEqual([
      ko(10, 10.8, "카메라는"),
      ja(10.8, 12, "山のカメラ"),
    ]);
    expect(out.candidates.map((c) => [c.start, c.end])).toEqual([[10.8, 12]]);
  });

  it("옛 이름 jaSide(ja-after)도 같은 뜻으로 읽는다", () => {
    const file = transcriptReviewSchema.parse({
      ...review(),
      lines: [{ ...line({ ...mixed, splitAt: 10.8 }), jaSide: "ja-after" }],
    });
    expect(file.lines[0].japaneseSide).toBe("after");
    expect(prepareReview(segments, file).segments).toEqual([
      ja(10.8, 12, "山のカメラ"),
    ]);
  });

  it("방향이 없으면 일본어가 앞(before)으로 본다", () => {
    const file = transcriptReviewSchema.parse(
      review(line({ ...mixed, splitAt: 10.8 })),
    );
    expect(file.lines[0].japaneseSide).toBeUndefined();
    expect(prepareReview(segments, file).segments).toEqual([
      ja(10, 10.8, "山のカメラ"),
    ]);
  });

  it("모르는 필드(audio의 추가 점수 등)가 있어도 읽는다", () => {
    const extra = {
      ...line(),
      audio: { simPlain: 1, simOriginal: 0.5, plainWhole: "…" },
      index: 3,
    };
    expect(() =>
      transcriptReviewSchema.parse({ ...review(), lines: [extra] }),
    ).not.toThrow();
  });
});

describe("정상 카드로 올릴 줄", () => {
  const none = new Set<string>();

  it("확신 높고 소리 확인을 통과했으며 prompt 없는 whisper도 고친 글에 가까워졌으면 올린다", () => {
    expect(promotable(line(), none)).toBe(true);
  });

  it("확신이 mid·low면 올리지 않는다", () => {
    expect(promotable(line({ confidence: "mid" }), none)).toBe(false);
    expect(promotable(line({ confidence: "low" }), none)).toBe(false);
  });

  it("소리 확인에 실패했으면 교재 낱말과 같아도 올리지 않는다", () => {
    const known = new Set([plainForm("山のカメラ。")]);
    expect(promotable(line({ audioVerified: false }), known)).toBe(false);
  });

  it("prompt 없는 whisper가 원래 글보다 가까워지지 않았으면 올리지 않는다", () => {
    const audio = { simPlain: 0.6, simOriginal: 0.6, spellingOnly: false };
    expect(promotable(line({ audio }), none)).toBe(false);
  });

  it("교재 낱말·등장인물 이름과 정확히 같으면 whisper 결과가 그대로여도 올린다", () => {
    const audio = { simPlain: 0.6, simOriginal: 0.6, spellingOnly: false };
    const word = line({
      audio,
      corrected: "カメラマン",
      reading: "かめらまん",
    });
    expect(promotable(word, new Set([plainForm("カメラマン")]))).toBe(true);
    // 가나 종류가 다르면 같은 낱말로 보지 않는다
    expect(promotable(word, new Set([plainForm("かめらまん")]))).toBe(false);
  });

  it("표기만 고친 줄은 prompt 없는 whisper 결과가 기준 이상이면 올린다", () => {
    const same = { simOriginal: 1, spellingOnly: true };
    expect(promotable(line({ audio: { ...same, simPlain: 1 } }), none)).toBe(
      true,
    );
    expect(promotable(line({ audio: { ...same, simPlain: 0.8 } }), none)).toBe(
      false,
    );
  });

  it("가나 3글자 이하인 줄은 올리지 않고, 4글자부터 올린다", () => {
    expect(
      promotable(line({ corrected: "山だ", reading: "やまだ" }), none),
    ).toBe(false);
    expect(
      promotable(line({ corrected: "山かな", reading: "やまかな" }), none),
    ).toBe(true);
  });

  it("긍정·부정 대답 낱말은 올리지 않는다", () => {
    expect(
      promotable(line({ corrected: "うーん", reading: "うーん" }), none),
    ).toBe(false);
  });

  it("한글이 섞인 고친 글이나 헛것·한국어 줄은 올리지 않는다", () => {
    expect(promotable(line({ corrected: "뭐뭐のカメラ" }), none)).toBe(false);
    expect(promotable(line({ kind: "other" }), none)).toBe(false);
    expect(promotable(line({ kind: "korean-noise" }), none)).toBe(false);
  });

  it("이름(name) 줄도 같은 기준으로 올린다", () => {
    expect(promotable(line({ kind: "name" }), none)).toBe(true);
  });
});

describe("올린 줄을 자막에 넣기", () => {
  const card = (ja: string, origin?: "transcript"): CueCard => ({
    ...(origin ? { origin } : {}),
    sentences: [{ ja, ko: "뜻", ruby: [{ text: ja }] }],
    whole: true,
    words: [],
  });
  const promotion = (start: number, end: number, text: string) => ({
    start,
    end,
    text,
    card: { ...card(text, "transcript"), reviewed: true },
  });

  it("같은 시각 구간의 글과 카드를 바꾼다", () => {
    const out = promoteSegments(
      [ko(0, 1, "설명"), ja(2, 3, "山野カメラ")],
      {},
      [promotion(2, 3, "山のカメラ")],
    );
    expect(out.segments[1].text).toBe("山のカメラ");
    expect(out.cards["1"].reviewed).toBe(true);
  });

  it("이미 소책자 문장과 맞은 구간은 그대로 둔다", () => {
    const booklet = card("山のカメラだ");
    const out = promoteSegments([ja(2, 3, "山のカメラだ")], { "0": booklet }, [
      promotion(2, 3, "山のカメラ"),
    ]);
    expect(out.cards["0"]).toBe(booklet);
    expect(out.segments[0].text).toBe("山のカメラだ");
  });

  it("거르기 단계에서 빠진 줄은 시각 차례 자리에 다시 넣고 카드 열쇠를 새로 매긴다", () => {
    const later = card("川だ");
    const out = promoteSegments(
      [ko(0, 1, "설명"), ja(5, 6, "川だ")],
      { "1": later },
      [promotion(2, 3, "山のカメラ")],
    );
    expect(out.segments.map((s) => s.start)).toEqual([0, 2, 5]);
    expect(out.cards["1"].reviewed).toBe(true);
    expect(out.cards["2"]).toBe(later);
  });
});
