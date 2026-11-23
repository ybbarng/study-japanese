import { describe, expect, it } from "vitest";
import {
  adoptFromServer,
  emptySongsStudy,
  isKnown,
  knownCount,
  lineKey,
  toggleKnown,
  toVersioned,
} from "./study-state";

const T = Date.UTC(2027, 0, 2);

describe("lineKey", () => {
  it("같은 글이면 같은 8자리 지문, 다른 글이면 다른 지문", () => {
    expect(lineKey("あめのひ")).toMatch(/^[0-9a-f]{8}$/);
    expect(lineKey("あめのひ")).toBe(lineKey("あめのひ"));
    expect(lineKey("あめのひ")).not.toBe(lineKey("あめのひ!"));
  });
});

describe("익힌 줄", () => {
  it("뒤집으면 익힘이 되고 다시 뒤집으면 풀리며, 비면 그 노래 칸을 지운다", () => {
    const on = toggleKnown(emptySongsStudy(), "test-song", "くりかえし", T);
    expect(isKnown(on, "test-song", "くりかえし")).toBe(true);
    expect(on.updatedAt).toBe(T);
    const off = toggleKnown(on, "test-song", "くりかえし", T + 1);
    expect(off.known).toEqual({});
  });

  it("가사 글을 저장하지 않고 지문만 둔다(공개 저장소로 나가는 기록이라)", () => {
    const on = toggleKnown(emptySongsStudy(), "test-song", "くりかえし", T);
    expect(on.known["test-song"]).toEqual([lineKey("くりかえし")]);
  });

  it("같은 글이 두 번 나오면 익힌 줄로 두 번 센다", () => {
    const on = toggleKnown(emptySongsStudy(), "test-song", "くりかえし", T);
    const keys = ["くりかえし", "まんなか", "くりかえし"].map(lineKey);
    expect(knownCount(on, "test-song", keys)).toBe(2);
    expect(knownCount(on, "other-song", keys)).toBe(0);
  });
});

describe("서버와 맞추기", () => {
  it("한 번도 고치지 않았으면 보낼 문서가 없다", () => {
    expect(toVersioned(emptySongsStudy())).toBeNull();
  });

  it("서버 문서가 더 새것이고 모양이 맞을 때만 받는다", () => {
    const local = toggleKnown(emptySongsStudy(), "a", "x", T);
    const server = toggleKnown(emptySongsStudy(), "b", "y", T + 5);
    expect(adoptFromServer(local, { value: server, updatedAt: T + 5 })).toEqual(
      server,
    );
    expect(adoptFromServer(local, { value: server, updatedAt: T })).toBeNull();
    expect(
      adoptFromServer(local, { value: { known: 3 }, updatedAt: T + 9 }),
    ).toBeNull();
  });
});
