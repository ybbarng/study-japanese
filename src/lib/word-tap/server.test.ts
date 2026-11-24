import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { lineHash } from "@/lib/songs/line-hash";
import type { IlmutaLesson } from "@/lib/textbook/schema";
import { loadIlmutaWordTap } from "./server";

// 지어낸 교재: 1강에 낱말 "山", 2강 문형 예문이 그 낱말을 쓴다
function lesson(no: number, examples: IlmutaLesson["examples"]): IlmutaLesson {
  return {
    no,
    title: "",
    lecture: { file: "x.mp3", durationSec: 1 },
    examples,
  };
}
const one = lesson(1, [
  {
    id: "01-2",
    file: "a.mp3",
    durationSec: 1,
    kind: "words",
    sentences: [{ ja: "山", ko: "산", reading: "やま" }],
  },
]);
const two = lesson(2, [
  {
    id: "02-3",
    file: "b.mp3",
    durationSec: 1,
    kind: "patterns",
    sentences: [{ ja: "山だ。", ko: "산이다." }],
  },
]);

let dir = "";
afterEach(() => rmSync(dir, { recursive: true, force: true }));

function writeAnalysis(no: number, data: object) {
  const target = path.join(dir, "textbook-analysis", "ilmuta");
  mkdirSync(target, { recursive: true });
  writeFileSync(path.join(target, `${no}.json`), JSON.stringify(data));
}

describe("loadIlmutaWordTap", () => {
  it("분석 파일을 문장 글로 찾게 싣고, 앞 강에서 배운 낱말을 강 번호와 함께 싣는다", () => {
    dir = mkdtempSync(path.join(tmpdir(), "word-tap-"));
    writeAnalysis(2, {
      book: "ilmuta",
      lesson: 2,
      analyzedAt: "2026-11-24",
      sentences: [
        {
          example: "02-3",
          index: 0,
          hash: lineHash("山だ。"),
          tokens: [{ start: 0, length: 1, reading: "やま", gloss: "산" }],
        },
      ],
    });
    const data = loadIlmutaWordTap([one, two], two, dir);
    expect(Object.keys(data.analyses)).toEqual(["山だ。"]);
    expect(data.learned).toEqual({ 山: 1 });
  });

  it("분석 파일이 없으면 빈 자료를 싣는다", () => {
    dir = mkdtempSync(path.join(tmpdir(), "word-tap-"));
    expect(loadIlmutaWordTap([one, two], two, dir)).toEqual({
      book: "ilmuta",
      lessonNo: 2,
      analyses: {},
      learned: {},
    });
  });
});
