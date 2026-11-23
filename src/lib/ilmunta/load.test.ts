import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { loadIlmunta } from "./load";

const dirs: string[] = [];
function contentWith(json?: unknown): string {
  const dir = mkdtempSync(path.join(tmpdir(), "ilmunta-"));
  dirs.push(dir);
  if (json !== undefined) {
    mkdirSync(path.join(dir, "textbook"));
    writeFileSync(
      path.join(dir, "textbook", "ilmunta.json"),
      JSON.stringify(json),
    );
  }
  return dir;
}
afterEach(() => {
  for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true });
});

describe("loadIlmunta", () => {
  it("파일이 없으면 null", () => {
    expect(loadIlmunta(contentWith())).toBeNull();
  });

  it("모양이 맞으면 검증한 교재를 돌려준다", () => {
    const book = loadIlmunta(
      contentWith({
        book: "ilmunta",
        lessons: [{ no: 1, title: "가짜 제목", lectures: [], examples: [] }],
      }),
    );
    expect(book?.lessons.map((l) => l.no)).toEqual([1]);
  });

  it("모양이 틀리면 던진다", () => {
    expect(() =>
      loadIlmunta(contentWith({ book: "ilmuta", lessons: [] })),
    ).toThrow();
  });
});
