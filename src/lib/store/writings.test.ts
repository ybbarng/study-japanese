import { describe, expect, it } from "vitest";
import { openDb } from "./db";
import {
  countWritten,
  getWriting,
  listWritings,
  putWriting,
  type WritingDoc,
} from "./writings";

const T0 = Date.UTC(2027, 0, 2, 1, 0); // 2027-01-02 토요일 10:00 KST

function doc(over: Partial<WritingDoc> = {}): WritingDoc {
  return {
    book: "ilmuta",
    lesson: 1,
    sentences: [{ text: "山は高い。" }, { text: "川は長い。" }, { text: "" }],
    updatedAt: T0,
    ...over,
  };
}

describe("쓴 문장 저장", () => {
  it("처음 저장한 문서를 그대로 읽는다", () => {
    const db = openDb(":memory:");
    putWriting(db, doc());
    expect(getWriting(db, "ilmuta", 1)).toEqual(doc());
  });

  it("없는 강은 null", () => {
    expect(getWriting(openDb(":memory:"), "ilmuta", 7)).toBeNull();
  });

  it("오래된 기기가 늦게 보낸 옛 문서는 무시하고 지금 문서를 돌려준다", () => {
    const db = openDb(":memory:");
    putWriting(db, doc({ updatedAt: T0 + 10 }));
    const r = putWriting(
      db,
      doc({ sentences: [{ text: "古い" }], updatedAt: T0 }),
    );
    expect(r.applied).toBe(false);
    expect(r.current.sentences[0].text).toBe("山は高い。");
  });

  it("책별로, 강 차례로 모은다", () => {
    const db = openDb(":memory:");
    putWriting(db, doc({ lesson: 3 }));
    putWriting(db, doc({ lesson: 1 }));
    putWriting(db, doc({ book: "ilmunta", lesson: 2 }));
    expect(listWritings(db, "ilmuta").map((d) => d.lesson)).toEqual([1, 3]);
    expect(listWritings(db).map((d) => `${d.book}-${d.lesson}`)).toEqual([
      "ilmunta-2",
      "ilmuta-1",
      "ilmuta-3",
    ]);
  });
});

describe("세션이 고쳐 준 말", () => {
  const corrected = doc({
    sentences: [
      { text: "山は高い。" },
      { text: "川は長い。", correction: "川は長いです。", note: "존댓말 강" },
      { text: "" },
    ],
    updatedAt: T0 + 100,
  });

  it("사용자가 글을 그대로 두고 다시 저장하면 고친 말이 남는다", () => {
    const db = openDb(":memory:");
    putWriting(db, doc());
    putWriting(db, corrected);
    putWriting(db, doc({ updatedAt: T0 + 200 }));
    expect(getWriting(db, "ilmuta", 1)?.sentences[1]).toEqual({
      text: "川は長い。",
      correction: "川は長いです。",
      note: "존댓말 강",
    });
  });

  it("사용자가 그 문장을 바꾸면 옛 고친 말은 버린다", () => {
    const db = openDb(":memory:");
    putWriting(db, corrected);
    putWriting(
      db,
      doc({
        sentences: [
          { text: "山は高い。" },
          { text: "川は長いです。" },
          { text: "" },
        ],
        updatedAt: T0 + 200,
      }),
    );
    expect(getWriting(db, "ilmuta", 1)?.sentences[1]).toEqual({
      text: "川は長いです。",
    });
  });
});

describe("쓴 문장 수", () => {
  it("빈칸과 공백만 있는 칸은 세지 않는다", () => {
    expect(
      countWritten(
        doc({ sentences: [{ text: "山" }, { text: " " }, { text: "" }] }),
      ),
    ).toBe(1);
  });

  it("문서가 없으면 0", () => {
    expect(countWritten(null)).toBe(0);
  });
});
