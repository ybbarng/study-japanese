import { describe, expect, it } from "vitest";
import {
  findInIndex,
  firstIlmutaLesson,
  type IndexEntry,
  lessonOfPage,
  parsePages,
  parseSharedStrings,
  parseSheetRows,
  toEntries,
} from "./word-index";

// 교재 글을 옮기지 않으려고, 모양만 같은 가짜 색인·문장을 쓴다
const entry = (page: number, reading: string, kanji = ""): IndexEntry => ({
  pages: [page],
  reading,
  kanji,
});

describe("xlsx 읽기", () => {
  it("공유 문자열의 서식 조각을 이어 붙이고 시트 칸을 글로 바꾼다", () => {
    const strings = parseSharedStrings(
      '<sst><si><t>のむ</t></si><si><r><t>마시</t></r><r><t xml:space="preserve">다</t></r></si><si><t>飲む</t></si></sst>',
    );
    expect(strings).toEqual(["のむ", "마시다", "飲む"]);
    const rows = parseSheetRows(
      '<sheetData><row r="9"><c r="A9" s="1"><v>078</v></c><c r="B9" t="s"><v>0</v></c><c r="C9" t="s"><v>2</v></c><c r="D9" t="s"><v>1</v></c></row></sheetData>',
      strings,
    );
    expect(rows).toEqual([{ A: "078", B: "のむ", C: "飲む", D: "마시다" }]);
  });

  it("쪽이 없는 머리줄은 건너뛴다", () => {
    expect(
      toEntries([
        { A: "あ", B: "단어", C: "한자" },
        { A: "078", B: "のむ", C: "飲む" },
      ]),
    ).toEqual([entry(78, "のむ", "飲む")]);
  });

  it("쪽 칸의 쉼표 목록은 모두, 물결 범위는 첫 쪽만 읽는다", () => {
    expect(parsePages("059")).toEqual([59]);
    expect(parsePages("44, 84, 362~368")).toEqual([44, 84, 362]);
  });
});

describe("쪽 → 과", () => {
  const lessons = [
    { no: 1, from: 23, to: 29 },
    { no: 2, from: 30, to: 36 },
    { no: 3, from: 38, to: 46 },
  ];
  it("과 범위 안 쪽은 그 과, 과 사이 쪽은 뒤 과, 1과 앞은 0, 마지막 과 뒤는 null", () => {
    expect(lessonOfPage(23, lessons)).toBe(1);
    expect(lessonOfPage(36, lessons)).toBe(2);
    expect(lessonOfPage(37, lessons)).toBe(3);
    expect(lessonOfPage(17, lessons)).toBe(0);
    expect(lessonOfPage(47, lessons)).toBeNull();
  });
});

describe("색인에서 낱말 찾기", () => {
  const entries = [
    entry(80, "のむ", "飲む"),
    entry(40, "しずかな", "静かな"),
    entry(110, "べんきょう", "勉強"),
    entry(150, "もってくる", "持ってくる"),
    entry(190, "わかる"),
    entry(35, "こども", "子供"),
    entry(90, "あう", "合う"),
    entry(160, "あう", "会う"),
  ];
  const find = (dict: string, reading: string) =>
    findInIndex({ dict, reading }, entries);

  it("표기가 같은 항목을 찾는다", () => {
    expect(find("飲む", "のむ")).toEqual({
      how: "exact",
      entry: entries[0],
    });
  });

  it("읽기만 같고 표기가 다른 동음이의어는 고르지 않는다", () => {
    expect(find("会う", "あう")?.entry.pages).toEqual([160]);
  });

  it("형용동사는 な를 붙여, する동사는 줄기로, 来る는 가나로 바꿔 찾는다", () => {
    expect(find("静か", "しずか")?.how).toBe("variant");
    expect(find("勉強する", "べんきょうする")?.entry.pages).toEqual([110]);
    expect(find("持って来る", "もってくる")?.entry.pages).toEqual([150]);
  });

  it("가나로만 실린 항목은 읽기로, 한자가 겹치는 다른 표기는 fuzzy로 찾는다", () => {
    expect(find("分かる", "わかる")?.how).toBe("kana");
    expect(find("子ども", "こども")?.how).toBe("fuzzy");
    expect(find("喋る", "しゃべる")).toBeNull();
  });
});

describe("일무따 첫 강", () => {
  const lessons = [
    { no: 1, words: [{ ja: "学生" }], texts: ["いるかな。"] },
    { no: 3, words: [], texts: ["コーヒーを飲んで、出かけた。"] },
    { no: 5, words: [{ ja: "猫", reading: "ねこ" }], texts: [] },
  ];
  it("낱말 목록이나 문장 속 활용형으로 처음 나온 강을 찾는다", () => {
    expect(
      firstIlmutaLesson(
        { dict: "学生", reading: "がくせい" },
        ["学生"],
        lessons,
      ),
    ).toBe(1);
    expect(
      firstIlmutaLesson(
        { dict: "飲む", reading: "のむ" },
        ["飲む", "飲んで"],
        lessons,
      ),
    ).toBe(3);
    expect(
      firstIlmutaLesson({ dict: "猫", reading: "ねこ" }, ["猫"], lessons),
    ).toBe(5);
  });

  it("가나뿐인 짧은 꼴(いる)은 다른 말 속 글자로 잘못 찾지 않는다", () => {
    expect(
      firstIlmutaLesson({ dict: "いる", reading: "いる" }, ["いる"], lessons),
    ).toBeNull();
  });
});
