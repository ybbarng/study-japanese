import { describe, expect, it } from "vitest";
import {
  ALL_CARD_IDS,
  BASIC,
  CONFUSABLE,
  cardChar,
  DAKUTEN,
  DAKUTEN_GRID,
  EXTENDED,
  GOJUON_GRID,
  HOMOPHONES,
  SOUND_BY_ID,
  SOUNDS,
  sameSound,
  YOON,
  YOON_GRID,
} from "./data";
import { hintFor } from "./hints";

const HIRA_BASIC =
  "あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん";
const KATA_BASIC =
  "アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン";
const HIRA_DAKU = "がぎぐげござじずぜぞだぢづでどばびぶべぼぱぴぷぺぽ";

const isHomophonePair = (a: string, b: string) =>
  HOMOPHONES.some(([p, q]) => (p === a && q === b) || (p === b && q === a));

describe("가나 데이터", () => {
  it("기본 46자는 히라가나·가타카나 모두 빠짐없이 순서대로 있다", () => {
    expect(BASIC.map((s) => s.hira).join("")).toBe(HIRA_BASIC);
    expect(BASIC.map((s) => s.kata).join("")).toBe(KATA_BASIC);
  });

  it("탁음·반탁음 25자가 빠짐없이 있다", () => {
    expect(DAKUTEN.map((s) => s.hira).join("")).toBe(HIRA_DAKU);
  });

  it("요음은 33개, 외래어 조합은 가타카나만 있다", () => {
    expect(YOON).toHaveLength(33);
    expect(EXTENDED.every((s) => s.kata && !s.hira)).toBe(true);
  });

  it("소리 id는 겹치지 않는다", () => {
    const ids = SOUNDS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("글자는 히라가나끼리, 가타카나끼리 겹치지 않는다", () => {
    const hira = SOUNDS.flatMap((s) => (s.hira ? [s.hira] : []));
    const kata = SOUNDS.flatMap((s) => (s.kata ? [s.kata] : []));
    expect(new Set(hira).size).toBe(hira.length);
    expect(new Set(kata).size).toBe(kata.length);
  });

  it("로마자가 겹치는 것은 정해 둔 같은 소리 짝(じ/ぢ, ず/づ)뿐이다", () => {
    const byRomaji = new Map<string, string[]>();
    for (const s of SOUNDS)
      byRomaji.set(s.romaji, [...(byRomaji.get(s.romaji) ?? []), s.id]);
    const dupes = [...byRomaji.values()].filter((ids) => ids.length > 1);
    expect(dupes).toEqual([
      ["o", "wo"],
      ["ji", "di"],
      ["zu", "du"],
    ]);
    for (const [a, b] of dupes) expect(isHomophonePair(a, b)).toBe(true);
  });

  it("한글 소리 표기가 겹치는 것도 같은 소리 짝뿐이다", () => {
    const byKo = new Map<string, string[]>();
    for (const s of SOUNDS) byKo.set(s.ko, [...(byKo.get(s.ko) ?? []), s.id]);
    const dupes = [...byKo.values()].filter((ids) => ids.length > 1);
    for (const [a, b, ...rest] of dupes) {
      expect(rest).toEqual([]);
      expect(isHomophonePair(a, b)).toBe(true);
    }
  });

  it("입력 철자는 소리끼리 겹치지 않는다", () => {
    const all = SOUNDS.flatMap((s) => s.input);
    expect(new Set(all).size).toBe(all.length);
  });

  it("헷갈리는 짝은 모두 있는 카드이고 같은 글자 종류끼리다", () => {
    const ids = new Set(ALL_CARD_IDS);
    for (const [a, b] of CONFUSABLE) {
      expect(ids.has(a) && ids.has(b)).toBe(true);
      expect(a.split(":")[0]).toBe(b.split(":")[0]);
    }
  });

  it("표(50음도·탁음·요음)의 칸은 모두 있는 소리이고, 기본·탁음·요음을 빠짐없이 덮는다", () => {
    const cells = [...GOJUON_GRID, ...DAKUTEN_GRID, ...YOON_GRID]
      .flat()
      .filter((x): x is string => x !== null);
    for (const c of cells) expect(SOUND_BY_ID.has(c)).toBe(true);
    const covered = new Set(cells);
    for (const s of [...BASIC, ...DAKUTEN, ...YOON])
      expect(covered.has(s.id)).toBe(true);
  });

  it("같은 소리 짝은 순서와 상관없이 같은 소리로 본다", () => {
    expect(sameSound("di", "ji")).toBe(true);
    expect(sameSound("ji", "di")).toBe(true);
    expect(sameSound("ka", "ga")).toBe(false);
  });

  it("카드 id로 글자를 찾는다", () => {
    expect(cardChar("hira:shi")).toBe("し");
    expect(cardChar("kata:fa")).toBe("ファ");
  });

  it("모든 카드에 비지 않은 연상 힌트가 있다", () => {
    const empty = ALL_CARD_IDS.filter((id) => hintFor(id).trim() === "");
    expect(empty).toEqual([]);
  });
});
