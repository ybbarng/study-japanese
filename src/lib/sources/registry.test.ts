import { describe, expect, it } from "vitest";
import { canSeeSource, SOURCES, sourceOfBook, sourceOfMedia } from "./registry";

describe("출처 목록", () => {
  it("출처마다 저작권자와 저작권 문구가 있다", () => {
    for (const s of SOURCES) {
      expect(s.rightsHolder).not.toBe("");
      expect(s.notice).toContain("저작권");
    }
  });

  it("media 폴더와 책 이름이 출처 사이에 겹치지 않는다", () => {
    const dirs = SOURCES.flatMap((s) => s.mediaDirs);
    const books = SOURCES.flatMap((s) => s.books);
    expect(new Set(dirs).size).toBe(dirs.length);
    expect(new Set(books).size).toBe(books.length);
  });

  it("교재 폴더와 책 이름으로 출처를 찾는다", () => {
    expect(sourceOfMedia("ilmunta")?.id).toBe("gilbut-ilmunta");
    expect(sourceOfMedia("kana")?.id).toBe("gilbut-ilmuta");
    expect(sourceOfBook("ilmuta")?.id).toBe("gilbut-ilmuta");
  });
});

describe("canSeeSource", () => {
  const ilmuta = sourceOfBook("ilmuta");

  it("닫지 않은 출처는 누구나 본다", () => {
    expect(canSeeSource(ilmuta, false, { closedSources: [] })).toBe(true);
  });

  it("닫은 출처는 관리자만 본다", () => {
    const settings = { closedSources: ["gilbut-ilmuta"] };
    expect(canSeeSource(ilmuta, false, settings)).toBe(false);
    expect(canSeeSource(ilmuta, true, settings)).toBe(true);
  });

  it("출처를 적지 않은 자료는 관리자만 본다(저절로 공개되지 않게)", () => {
    expect(canSeeSource(undefined, false, { closedSources: [] })).toBe(false);
    expect(canSeeSource(undefined, true, { closedSources: [] })).toBe(true);
  });
});
