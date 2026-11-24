import { describe, expect, it } from "vitest";
import type { CueCard, CueWord } from "./cards";
import {
  annotate,
  findHangulWords,
  type RepairSegment,
  repairCards,
  wordSentence,
} from "./repair";

// 교재 글이 아니라 모양만 같은 가짜 낱말·문장을 쓴다(저장소 규칙)

const egg: CueWord = { ja: "卵", reading: "たまご", ko: "달걀" };
const train: CueWord = { ja: "電車", reading: "でんしゃ", ko: "전철" };
const words = [egg, train];
const plain = (t: string) => t;

const ja = (text: string, start: number): RepairSegment => ({
  text,
  lang: "ja",
  start,
});
const ko = (text: string, start: number): RepairSegment => ({
  text,
  lang: "ko",
  start,
});
const lead = (w: CueWord): CueCard => ({
  sentences: [wordSentence(w)],
  whole: true,
  words: [],
});

describe("한글로 적힌 일본어 낱말 찾기", () => {
  it("한글 조각 앞부분이 낱말 소리와 같으면 찾고, 뒤는 조사로 본다", () => {
    expect(findHangulWords("타마고나 달걀", words)).toEqual([
      { end: 3, word: egg, score: 1 },
    ]);
  });

  it("소리 하나가 빠진 받아쓰기도 찾는다", () => {
    expect(findHangulWords("덴샤는", words).map((h) => h.word.ja)).toEqual([
      "電車",
    ]);
  });

  it("모음 하나만 다른 한국어 낱말은 일본어로 보지 않는다", () => {
    expect(findHangulWords("동사는 움직임", words)).toEqual([]);
  });

  it("한 낱말을 띄어 받아 적은 것도 빈칸을 건너 이어 찾는다", () => {
    const text = "타마 고는 달걀";
    expect(annotate(text, findHangulWords(text, words))).toBe(
      "타마 고(卵)는 달걀",
    );
  });

  it("띄어 쓴 두 조각은 소리가 똑같아도 다음 조각 중간에서 끝나면 보지 않는다", () => {
    // 「타마 고기」: 고 뒤에 조사가 아닌 글자가 이어지면 한국어 낱말이다
    expect(findHangulWords("타마 고기를", words)).toEqual([]);
  });

  it("띄어 쓴 두 조각은 소리 하나라도 다르면 보지 않는다", () => {
    expect(findHangulWords("단 샤는", words)).toEqual([]);
  });

  it("찾은 자리 뒤에 일본어 표기를 덧붙인다", () => {
    const text = "타마고나 달걀";
    expect(annotate(text, findHangulWords(text, words))).toBe(
      "타마고(卵)나 달걀",
    );
  });
});

describe("이웃 문장으로 받아쓰기 채우기", () => {
  it("같은 낱말 사이에 낀 가나 줄은 그 낱말 카드를 받는다(낱말 → 뜻 → 낱말)", () => {
    const segments = [ja("卵", 0), ja("たるか", 2), ja("卵", 4)];
    const out = repairCards(
      segments,
      { "0": lead(egg), "2": lead(egg) },
      words,
      plain,
    );
    expect(out["1"]).toEqual({ ...lead(egg), inferred: true });
  });

  it("소리가 닮은 다음 줄은 같은 낱말을 다시 말한 것으로 본다", () => {
    const out = repairCards(
      [ja("卵", 0), ko("달걀", 2), ja("たまこ", 4)],
      { "0": lead(egg) },
      words,
      plain,
    );
    expect(out["2"].sentences.map((s) => s.ja)).toEqual(["卵"]);
  });

  it("한자가 든 줄과 맞장구는 덮지 않는다(제대로 받아 적은 다른 말일 수 있다)", () => {
    const out = repairCards(
      [ja("卵", 0), ja("卵焼き", 2), ja("はい", 3), ja("卵", 4)],
      { "0": lead(egg), "3": lead(egg) },
      words,
      plain,
    );
    expect(out["1"]).toBeUndefined();
    expect(out["2"]).toBeUndefined();
  });

  it("멀리 떨어진 문장으로는 채우지 않는다", () => {
    const out = repairCards(
      [ja("卵", 0), ja("たまこ", 60)],
      { "0": lead(egg) },
      words,
      plain,
    );
    expect(out["1"]).toBeUndefined();
  });
});

describe("한국어 줄 속 일본어", () => {
  it("한국어 줄이 통째로 낱말 소리면 그 낱말 카드가 된다", () => {
    const out = repairCards([ko("다마고?", 0)], {}, words, plain);
    expect(out["0"]).toEqual({
      sentences: [
        { ja: "卵", ko: "달걀", ruby: [{ text: "卵", reading: "たまご" }] },
      ],
      whole: true,
      words: [],
      inferred: true,
    });
  });

  it("설명 속 낱말은 표기를 덧붙이고 낱말 칩을 단다", () => {
    const out = repairCards(
      [ko("여기서 타마고나 라고 하면", 0)],
      {},
      words,
      plain,
    );
    expect(out["0"].text).toBe("여기서 타마고(卵)나 라고 하면");
    expect(out["0"].words).toEqual([egg]);
    expect(out["0"].whole).toBe(false);
  });

  it("맞춘 문장 바로 뒤의 한국어 줄(그 문장의 뜻)에는 덧붙이지 않는다", () => {
    const out = repairCards(
      [ja("卵", 0), ko("타마고나 달걀이야", 2)],
      { "0": lead(egg) },
      words,
      plain,
    );
    expect(out["1"]).toBeUndefined();
  });
});

describe("받아 적은 일본어 줄 다듬기", () => {
  it("가나로 적힌 낱말을 읽는 법으로 찾아 칩을 단다", () => {
    const out = repairCards([ja("これはたまごだよ", 0)], {}, words, plain);
    expect(out["0"].words).toEqual([egg]);
  });

  it("맞추지 못한 일본어·뜻·일본어 되풀이는 한자로 적은 쪽을 두 줄에 보인다(가나 줄의 틀린 읽기를 감춘다)", () => {
    const toKana = (t: string) => t.replace("雪", "ゆき").replace("降", "ふ");
    const out = repairCards(
      [ja("雪が降る", 0), ko("눈이 와", 2), ja("ゆきがふるう", 4)],
      {},
      [],
      toKana,
    );
    expect(out["2"].text).toBe("雪が降る");
    expect(out["0"]).toBeUndefined();
  });
});
