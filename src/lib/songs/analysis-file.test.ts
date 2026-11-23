import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { loadSongAnalysis } from "./analysis-file";

// 분석 파일에는 가사 글이 없다(차례·지문·위치만).

function contentWith(slug: string, body: unknown): string {
  const dir = mkdtempSync(path.join(tmpdir(), "sj-songs-"));
  mkdirSync(path.join(dir, "songs"));
  writeFileSync(path.join(dir, "songs", `${slug}.json`), JSON.stringify(body));
  return dir;
}

const good = (slug: string) => ({
  slug,
  analyzedAt: "2026-11-23",
  lines: [{ index: 0, hash: "0123abcd", tokens: [{ start: 0, length: 2 }] }],
});

describe("loadSongAnalysis", () => {
  it("파일이 없으면 none", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "sj-songs-"));
    expect(loadSongAnalysis("test-song", dir)).toEqual({ status: "none" });
  });

  it("맞는 파일은 검증한 분석을 돌려준다", () => {
    const dir = contentWith("test-song", good("test-song"));
    const loaded = loadSongAnalysis("test-song", dir);
    expect(loaded.status === "ok" && loaded.analysis.lines[0].hash).toBe(
      "0123abcd",
    );
  });

  it("모양이 틀리면 broken(화면을 깨뜨리지 않는다)", () => {
    const dir = contentWith("test-song", { slug: "test-song" });
    expect(loadSongAnalysis("test-song", dir)).toEqual({ status: "broken" });
  });

  it("다른 노래의 분석이면 broken", () => {
    const dir = contentWith("test-song", good("other-song"));
    expect(loadSongAnalysis("test-song", dir)).toEqual({ status: "broken" });
  });

  it("주소 이름 모양이 틀리면 파일을 찾지 않는다", () => {
    expect(loadSongAnalysis("../x", "/")).toEqual({ status: "none" });
  });
});
