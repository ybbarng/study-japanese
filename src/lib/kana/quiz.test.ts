import { describe, expect, it } from "vitest";
import { type CardId, parseCardId, sameSound } from "./data";
import { makeQuiz, pickDistractors, seededRng, shuffle } from "./quiz";

const POOL: CardId[] = [
  "hira:sa",
  "hira:shi",
  "hira:su",
  "hira:se",
  "hira:so",
  "hira:ta",
  "hira:chi",
  "hira:tsu",
  "hira:te",
  "hira:to",
];

describe("seededRng / shuffle", () => {
  it("같은 씨앗이면 같은 순서로 섞는다", () => {
    expect(shuffle(POOL, seededRng(7))).toEqual(shuffle(POOL, seededRng(7)));
  });

  it("섞어도 원소는 그대로다", () => {
    expect([...shuffle(POOL, seededRng(1))].sort()).toEqual([...POOL].sort());
  });
});

describe("pickDistractors", () => {
  it("헷갈리는 짝이 묶음에 있으면 오답 보기에 넣는다", () => {
    for (let seed = 0; seed < 20; seed++) {
      expect(pickDistractors("hira:sa", POOL, seededRng(seed))).toContain(
        "hira:chi",
      );
    }
  });

  it("같은 소리(じ/ぢ)나 다른 글자 종류는 오답 보기에 넣지 않는다", () => {
    const pool: CardId[] = [
      "hira:ji",
      "hira:di",
      "kata:za",
      "hira:za",
      "hira:zu",
      "hira:du",
      "hira:ze",
    ];
    for (let seed = 0; seed < 20; seed++) {
      const ds = pickDistractors("hira:ji", pool, seededRng(seed));
      expect(ds).toHaveLength(3);
      expect(ds).not.toContain("hira:di");
      expect(ds.every((d) => parseCardId(d).script === "hira")).toBe(true);
      // 보기끼리도 같은 소리가 겹치지 않는다(ず/づ가 함께 나오지 않음)
      const sounds = ds.map((d) => parseCardId(d).soundId);
      for (const a of sounds)
        expect(sounds.filter((b) => sameSound(a, b))).toHaveLength(1);
    }
  });

  it("묶음이 작으면 같은 글자 종류 전체에서 채운다", () => {
    const ds = pickDistractors("hira:a", ["hira:a", "hira:i"], seededRng(3));
    expect(ds).toHaveLength(3);
    expect(ds).toContain("hira:i");
  });
});

describe("makeQuiz", () => {
  it("요청한 개수만큼, 보기 넷에 답이 하나씩 든 문제를 낸다", () => {
    const quiz = makeQuiz(POOL, 12, seededRng(42));
    expect(quiz).toHaveLength(12);
    for (const q of quiz) {
      expect(q.choices).toHaveLength(4);
      expect(q.choices.filter((c) => c === q.answer)).toHaveLength(1);
    }
  });

  it("묶음의 글자를 모두 한 번 이상 묻는다", () => {
    const quiz = makeQuiz(POOL, POOL.length, seededRng(5));
    expect(new Set(quiz.map((q) => q.answer)).size).toBe(POOL.length);
  });

  it("같은 글자를 연달아 묻지 않는다", () => {
    for (let seed = 0; seed < 30; seed++) {
      const quiz = makeQuiz(POOL.slice(0, 3), 12, seededRng(seed));
      for (let i = 1; i < quiz.length; i++)
        expect(quiz[i].answer).not.toBe(quiz[i - 1].answer);
    }
  });

  it("소리를 쓸 수 없으면 글자 보기 문제만 낸다", () => {
    const quiz = makeQuiz(POOL, 6, seededRng(9), false);
    expect(quiz.every((q) => q.kind === "char-to-sound")).toBe(true);
  });
});
