import { describe, expect, it } from "vitest";
import {
  ilmuntaExampleFiles,
  ilmuntaLectureFiles,
  ilmutaExampleFiles,
  ilmutaLectureFiles,
} from "./media-files";

describe("일무따 파일 이름", () => {
  it("강의 파일을 강 번호로 찾는다", () => {
    const map = ilmutaLectureFiles(["L00.mp3", "L12.mp3", "note.txt"]);
    expect([...map.entries()]).toEqual([
      [0, "L00.mp3"],
      [12, "L12.mp3"],
    ]);
  });

  it("예문 파일을 이름 차례로 늘어놓고 번호로 종류를 정한다", () => {
    const files = ilmutaExampleFiles([
      "01-5.mp3",
      "01-4-2.mp3",
      "01-1.mp3",
      "01-4-1.mp3",
      "40-6.mp3",
      "02-3.mp3",
    ]);
    expect(files.map((f) => [f.id, f.lesson, f.kind])).toEqual([
      ["01-1", 1, "dialogue"],
      ["01-4-1", 1, "conversationBasic"],
      ["01-4-2", 1, "conversationAdvanced"],
      ["01-5", 1, "exercise"],
      ["02-3", 2, "patterns"],
      ["40-6", 40, "longReading"],
    ]);
  });
});

describe("일문따 파일 이름", () => {
  it("강의 파일을 과마다 묶고 숫자 차례로 늘어놓는다", () => {
    const map = ilmuntaLectureFiles([
      "L26-02-02-_2_.MP3",
      "L26-10.MP3",
      "L26-02-02-_1_.MP3",
      "L26-02.MP3",
      "L01-01.MP3",
    ]);
    expect(map.get(1)).toEqual(["L01-01.MP3"]);
    expect(map.get(26)).toEqual([
      "L26-02.MP3",
      "L26-02-02-_1_.MP3",
      "L26-02-02-_2_.MP3",
      "L26-10.MP3",
    ]);
  });

  it("예문 -1은 문법 예문, -2는 읽기 글로 본다", () => {
    const files = ilmuntaExampleFiles(["30-2.MP3", "01-2.MP3", "01-1.MP3"]);
    expect(files.map((f) => [f.id, f.lesson, f.kind])).toEqual([
      ["01-1", 1, "grammarExamples"],
      ["01-2", 1, "reading"],
      ["30-2", 30, "reading"],
    ]);
  });
});
