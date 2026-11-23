import { describe, expect, it } from "vitest";
import type { IlmuntaLesson } from "@/lib/textbook/schema";
import { lessonTracks } from "./tracks";

const lesson: IlmuntaLesson = {
  no: 3,
  title: "가짜 제목",
  lectures: [
    { file: "강의 mp3/L03-01.MP3", durationSec: 60 },
    { file: "강의 mp3/L03-02.MP3", durationSec: 60 },
  ],
  examples: [
    {
      id: "03-1",
      file: "예문 mp3/03-1.MP3",
      durationSec: 30,
      kind: "grammarExamples",
      sentences: [],
    },
  ],
};

describe("lessonTracks", () => {
  it("강의 다음에 예문을 놓고, 들은 기록 열쇠를 단다", () => {
    const tracks = lessonTracks(lesson);
    expect(tracks.map((t) => [t.item, t.kind, t.title])).toEqual([
      ["L03-01", "lecture", "3과 강의 1/2"],
      ["L03-02", "lecture", "3과 강의 2/2"],
      ["03-1", "example", "3과 문법 예문"],
    ]);
    expect(tracks.every((t) => t.book === "ilmunta")).toBe(true);
    expect(tracks[2].src).toBe(
      "/media/ilmunta/%EC%98%88%EB%AC%B8%20mp3/03-1.MP3",
    );
  });
});
