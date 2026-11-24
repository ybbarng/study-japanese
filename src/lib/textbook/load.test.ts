import { mkdirSync, mkdtempSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { loadIlmuta, loadIlmutaTranscript, loadTranscript } from "./load";

function contentDir(): string {
  return mkdtempSync(path.join(tmpdir(), "sj-content-"));
}

function writeBook(dir: string, title: string, mtime = new Date(2026, 0, 1)) {
  mkdirSync(path.join(dir, "textbook"), { recursive: true });
  const file = path.join(dir, "textbook", "ilmuta.json");
  writeFileSync(
    file,
    JSON.stringify({
      book: "ilmuta",
      extras: [],
      lessons: [
        {
          no: 1,
          title,
          lecture: { file: "1. 음성 강의/L01.mp3", durationSec: 1 },
          examples: [],
        },
      ],
    }),
  );
  utimesSync(file, mtime, mtime);
}

describe("교재 읽기", () => {
  it("파일이 없으면 null", () => {
    expect(loadIlmuta(contentDir())).toBeNull();
  });

  it("검증한 교재를 돌려준다", () => {
    const dir = contentDir();
    writeBook(dir, "やあ。");
    expect(loadIlmuta(dir)?.lessons[0].title).toBe("やあ。");
  });

  it("파일이 바뀌면 다시 읽는다", () => {
    const dir = contentDir();
    writeBook(dir, "やあ。", new Date(2026, 0, 1));
    loadIlmuta(dir);
    writeBook(dir, "うん。", new Date(2026, 0, 2));
    expect(loadIlmuta(dir)?.lessons[0].title).toBe("うん。");
  });

  it("모양이 틀리면 던진다", () => {
    const dir = contentDir();
    mkdirSync(path.join(dir, "textbook"));
    writeFileSync(path.join(dir, "textbook", "ilmuta.json"), '{"book":"x"}');
    expect(() => loadIlmuta(dir)).toThrow();
  });
});

describe("강의 자막 읽기", () => {
  it("파일이 없으면 null", () => {
    expect(loadIlmutaTranscript("L01", contentDir())).toBeNull();
  });

  it("있으면 자막을 돌려준다", () => {
    const dir = contentDir();
    mkdirSync(path.join(dir, "transcripts", "ilmuta"), { recursive: true });
    writeFileSync(
      path.join(dir, "transcripts", "ilmuta", "L01.json"),
      JSON.stringify({
        book: "ilmuta",
        item: "L01",
        kind: "lecture",
        durationSec: 3,
        segments: [{ start: 0, end: 1, text: "안녕", lang: "ko" }],
      }),
    );
    expect(loadIlmutaTranscript("L01", dir)?.segments).toEqual([
      { start: 0, end: 1, text: "안녕", lang: "ko" },
    ]);
  });

  it("깨진 자막은 화면을 막지 않게 null", () => {
    const dir = contentDir();
    mkdirSync(path.join(dir, "transcripts", "ilmuta"), { recursive: true });
    writeFileSync(path.join(dir, "transcripts", "ilmuta", "L02.json"), "{");
    expect(loadIlmutaTranscript("L02", dir)).toBeNull();
  });

  it("강의 항목 모양이 아니면 파일을 찾지 않는다", () => {
    expect(loadIlmutaTranscript("../x", contentDir())).toBeNull();
  });
});

describe("책에 상관없이 자막 읽기", () => {
  it("일문따 강의 자막도 같은 모양으로 읽는다", () => {
    const dir = contentDir();
    mkdirSync(path.join(dir, "transcripts", "ilmunta"), { recursive: true });
    writeFileSync(
      path.join(dir, "transcripts", "ilmunta", "L01-01.json"),
      JSON.stringify({
        book: "ilmunta",
        item: "L01-01",
        kind: "lecture",
        durationSec: 2,
        segments: [{ start: 0, end: 1.5, text: "見る", lang: "ja" }],
      }),
    );
    expect(loadTranscript("ilmunta", "L01-01", dir)?.segments[0].text).toBe(
      "見る",
    );
  });

  it("나뉜 강의 파일 이름(`L26-02-02-_1_`)처럼 밑줄이 든 항목도 읽는다", () => {
    const dir = contentDir();
    mkdirSync(path.join(dir, "transcripts", "ilmunta"), { recursive: true });
    writeFileSync(
      path.join(dir, "transcripts", "ilmunta", "L26-02-02-_1_.json"),
      JSON.stringify({
        book: "ilmunta",
        item: "L26-02-02-_1_",
        kind: "lecture",
        durationSec: 2,
        segments: [{ start: 0, end: 1, text: "가짜", lang: "ko" }],
      }),
    );
    expect(
      loadTranscript("ilmunta", "L26-02-02-_1_", dir)?.segments[0].text,
    ).toBe("가짜");
  });

  it.each([
    ["kana", "a"],
    ["ilmuta", "../L01"],
    ["ilmuta", "L01/../../x"],
    ["ilmuta", ""],
  ])("허용하지 않는 책·항목 %s/%s는 파일을 찾지 않는다", (book, item) => {
    expect(loadTranscript(book, item, contentDir())).toBeNull();
  });
});
