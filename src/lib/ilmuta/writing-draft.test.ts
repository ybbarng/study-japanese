import { describe, expect, it } from "vitest";
import type { WritingDoc } from "@/lib/store/writings";
import { initialTexts, parseDraft, toWritingDoc } from "./writing-draft";

const T0 = Date.UTC(2027, 0, 2, 1, 0);

const server: WritingDoc = {
  book: "ilmuta",
  lesson: 1,
  sentences: [{ text: "山は高い。", correction: "山は高いです。" }],
  updatedAt: T0,
};

describe("쓰기 칸의 처음 값", () => {
  it("서버 글을 세 칸에 맞춰 채운다", () => {
    expect(initialTexts(server, null)).toEqual({
      texts: ["山は高い。", "", ""],
      fromDraft: false,
    });
  });

  it("서버보다 늦게 고친 초안이 있으면 초안을 쓴다", () => {
    expect(initialTexts(server, { texts: ["川"], updatedAt: T0 + 1 })).toEqual({
      texts: ["川", "", ""],
      fromDraft: true,
    });
  });

  it("서버가 더 늦으면(다른 기기에서 저장) 옛 초안을 버린다", () => {
    expect(
      initialTexts(server, { texts: ["川"], updatedAt: T0 - 1 }).fromDraft,
    ).toBe(false);
  });

  it("아무것도 없으면 빈칸 세 개", () => {
    expect(initialTexts(null, null).texts).toEqual(["", "", ""]);
  });
});

describe("보낼 문서", () => {
  it("앞뒤 공백을 지우고 고친 말 없이 글만 보낸다", () => {
    expect(toWritingDoc(1, [" 山は高い。 ", ""], T0)).toEqual({
      book: "ilmuta",
      lesson: 1,
      sentences: [{ text: "山は高い。" }, { text: "" }],
      updatedAt: T0,
    });
  });
});

describe("초안 읽기", () => {
  it("모양이 맞으면 읽는다", () => {
    expect(parseDraft('{"texts":["a"],"updatedAt":5}')).toEqual({
      texts: ["a"],
      updatedAt: 5,
    });
  });

  it("깨졌거나 모양이 틀리면 null", () => {
    expect(parseDraft("{")).toBeNull();
    expect(parseDraft('{"texts":"a"}')).toBeNull();
    expect(parseDraft(null)).toBeNull();
  });
});
