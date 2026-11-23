import { describe, expect, it } from "vitest";
import { ALL_CARD_IDS, getSound } from "./data";
import { LESSONS, learnedThrough, lessonCards, nextLesson } from "./lessons";
import { isReadableWith, requirementsOf } from "./text";

describe("레슨 구성", () => {
  it("레슨 id는 겹치지 않는다", () => {
    const ids = LESSONS.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("모든 카드를 정확히 한 레슨에서 배운다", () => {
    const taught = LESSONS.flatMap(lessonCards);
    expect(new Set(taught).size).toBe(taught.length);
    expect([...taught].sort()).toEqual([...ALL_CARD_IDS].sort());
  });

  it("레슨의 소리는 그 글자 종류에 글자가 있다", () => {
    for (const l of LESSONS)
      for (const s of l.sounds) expect(getSound(s)[l.script]).toBeTruthy();
  });

  it("히라가나 레슨이 모두 가타카나 레슨보다 앞선다", () => {
    const scripts = LESSONS.map((l) => (l.script === "hira" ? "h" : "k"));
    expect(scripts.join("")).toMatch(/^h+k+$/);
  });

  it("레슨마다 낱말이 다섯 개 이상 있고 낱말끼리 겹치지 않는다", () => {
    for (const l of LESSONS) {
      expect(l.words.length, l.id).toBeGreaterThanOrEqual(5);
      const kana = l.words.map((w) => w.kana);
      expect(new Set(kana).size, l.id).toBe(kana.length);
    }
  });

  it("낱말은 그 레슨까지 배운 글자·표시만으로 되어 있다", () => {
    const unreadable: string[] = [];
    for (const l of LESSONS) {
      const { cards, marks } = learnedThrough(l.id);
      for (const w of l.words) {
        if (!isReadableWith(w.kana, cards, marks[l.script]))
          unreadable.push(`${l.id} ${w.kana}`);
      }
    }
    expect(unreadable).toEqual([]);
  });

  it("레슨마다 새로 배운 글자가 낱말에 하나 이상 나온다", () => {
    for (const l of LESSONS) {
      const fresh = new Set(lessonCards(l));
      const used = l.words.flatMap((w) => requirementsOf(w.kana).cards);
      expect(
        used.some((c) => fresh.has(c)),
        l.id,
      ).toBe(true);
    }
  });

  it("다음 레슨은 끝내지 않은 것 중 첫 번째이고, 다 끝내면 없다", () => {
    expect(nextLesson(new Set())?.id).toBe("h1");
    expect(nextLesson(new Set(["h1", "h2"]))?.id).toBe("h3");
    expect(nextLesson(new Set(LESSONS.map((l) => l.id)))).toBeNull();
  });
});
