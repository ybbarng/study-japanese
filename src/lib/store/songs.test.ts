import { describe, expect, it } from "vitest";
import { canSeeLyrics, songInputSchema } from "@/lib/songs/schema";
import { lineKey } from "@/lib/songs/study-state";
import { openDb } from "./db";
import { deleteSong, getSong, listSongs, putSong, toSummary } from "./songs";

// 가사는 실제 노래가 아니라 모양만 같은 가짜 줄이다(공개 저장소).
const T0 = Date.UTC(2027, 0, 2, 1, 0);

function input(over: Partial<Parameters<typeof putSong>[2]> = {}) {
  return {
    title: "テストのうた",
    artist: "시험 가수",
    audioFile: "test-song.mp3",
    lyricsPublic: true,
    lines: [
      {
        ja: "あめのひ",
        start: 1.5,
        tokens: [{ surface: "あめ" }, { surface: "の" }, { surface: "ひ" }],
      },
      { ja: "くりかえし" },
    ],
    ...over,
  };
}

describe("노래 저장", () => {
  it("넣은 노래를 그대로 읽는다", () => {
    const db = openDb(":memory:");
    putSong(db, "test-song", input(), T0);
    expect(getSong(db, "test-song")).toEqual({
      slug: "test-song",
      ...input(),
      createdAt: T0,
      updatedAt: T0,
    });
  });

  it("없는 노래는 null", () => {
    expect(getSong(openDb(":memory:"), "none")).toBeNull();
  });

  it("고치면 고친 시각만 바뀌고 처음 넣은 시각은 남는다", () => {
    const db = openDb(":memory:");
    putSong(db, "test-song", input(), T0);
    const saved = putSong(
      db,
      "test-song",
      input({ title: "고친 제목", lyricsPublic: false }),
      T0 + 60,
    );
    expect(saved).toMatchObject({
      title: "고친 제목",
      lyricsPublic: false,
      createdAt: T0,
      updatedAt: T0 + 60,
    });
  });

  it("목록은 제목 차례", () => {
    const db = openDb(":memory:");
    putSong(db, "b-song", input({ title: "ふたつめ" }), T0);
    putSong(db, "a-song", input({ title: "ひとつめ" }), T0);
    expect(listSongs(db).map((s) => s.slug)).toEqual(["a-song", "b-song"]);
  });

  it("지우면 true, 없던 노래를 지우면 false", () => {
    const db = openDb(":memory:");
    putSong(db, "test-song", input(), T0);
    expect(deleteSong(db, "test-song")).toBe(true);
    expect(deleteSong(db, "test-song")).toBe(false);
    expect(getSong(db, "test-song")).toBeNull();
  });
});

describe("목록 요약", () => {
  it("줄 수·맞춘 줄 수와 줄 지문만 담고 가사 글은 담지 않는다", () => {
    const db = openDb(":memory:");
    const summary = toSummary(putSong(db, "test-song", input(), T0));
    expect(summary).toEqual({
      slug: "test-song",
      title: "テストのうた",
      artist: "시험 가수",
      lyricsPublic: true,
      lineCount: 2,
      timedCount: 1,
      lineKeys: [lineKey("あめのひ"), lineKey("くりかえし")],
      updatedAt: T0,
    });
    expect(JSON.stringify(summary)).not.toContain("あめのひ");
  });
});

describe("가사 공개", () => {
  it("공개한 노래는 누구나, 닫은 노래는 관리자만 본다", () => {
    expect(canSeeLyrics({ lyricsPublic: true }, false)).toBe(true);
    expect(canSeeLyrics({ lyricsPublic: false }, false)).toBe(false);
    expect(canSeeLyrics({ lyricsPublic: false }, true)).toBe(true);
  });
});

describe("들어오는 노래 검사", () => {
  const body = {
    title: "t",
    artist: "a",
    audioFile: "test-song.mp3",
    lines: [{ ja: "あ" }],
  };

  it("가사 공개를 주지 않으면 공개로 본다", () => {
    expect(songInputSchema.parse(body).lyricsPublic).toBe(true);
  });

  it.each([
    ["폴더를 넘나드는 파일 이름", { audioFile: "../secret.mp3" }],
    ["허용하지 않은 형식", { audioFile: "song.wav" }],
    ["빈 가사 줄", { lines: [{ ja: "   " }] }],
    ["한 시간을 넘는 시각", { lines: [{ ja: "あ", start: 3601 }] }],
    ["301줄", { lines: Array.from({ length: 301 }, () => ({ ja: "あ" })) }],
  ])("%s은 받지 않는다", (_, over) => {
    expect(songInputSchema.safeParse({ ...body, ...over }).success).toBe(false);
  });
});
