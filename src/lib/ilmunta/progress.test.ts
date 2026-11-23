import { describe, expect, it } from "vitest";
import type { ItemSummary } from "@/lib/store/listen";
import type { IlmuntaLesson } from "@/lib/textbook/schema";
import { ilmuntaMediaUrl } from "./media";
import { lectureItem, lessonListens, resumeLesson } from "./progress";

const lesson = (no: number, lectures: number): IlmuntaLesson => {
  const nn = String(no).padStart(2, "0");
  return {
    no,
    title: `제목 ${no}`,
    lectures: Array.from({ length: lectures }, (_, i) => ({
      file: `강의 mp3/L${nn}-0${i + 1}.MP3`,
      durationSec: 60,
    })),
    examples: [
      {
        id: `${nn}-1`,
        file: `예문 mp3/${nn}-1.MP3`,
        durationSec: 30,
        kind: "grammarExamples",
        sentences: [],
      },
    ],
  };
};
const heard = (
  item: string,
  lastAt: number,
  completedPlays = 1,
): ItemSummary => ({
  item,
  kind: "lecture",
  plays: 1,
  completedPlays,
  listenedSec: 60,
  lastAt,
});

const lessons = [lesson(1, 2), lesson(2, 3), lesson(3, 1)];

describe("lectureItem", () => {
  it("강의 파일 이름에서 확장자를 뗀다", () => {
    expect(lectureItem("강의 mp3/L01-02.MP3")).toBe("L01-02");
  });
});

describe("lessonListens", () => {
  it("끝까지 들은 강의 수와 마지막으로 들은 시각을 센다", () => {
    const r = lessonListens(lessons, [
      heard("L01-01", 100),
      heard("L01-02", 200, 0),
      heard("01-1", 300),
    ]);
    expect(r[0]).toEqual({ no: 1, heard: 1, total: 2, lastAt: 300 });
    expect(r[1]).toEqual({ no: 2, heard: 0, total: 3, lastAt: 0 });
  });
});

describe("resumeLesson", () => {
  it("아무것도 안 들었으면 첫 과", () => {
    expect(resumeLesson(lessonListens(lessons, []))).toBe(1);
  });

  it("마지막으로 들은 과의 강의가 남았으면 그 과", () => {
    expect(
      resumeLesson(
        lessonListens(lessons, [heard("L02-01", 500), heard("L01-01", 100)]),
      ),
    ).toBe(2);
  });

  it("마지막으로 들은 과를 다 들었으면 다음 과", () => {
    const items = ["L01-01", "L01-02"].map((id, i) => heard(id, 100 + i));
    expect(resumeLesson(lessonListens(lessons, items))).toBe(2);
  });

  it("모두 들었으면 null", () => {
    const items = [
      "L01-01",
      "L01-02",
      "L02-01",
      "L02-02",
      "L02-03",
      "L03-01",
    ].map((id, i) => heard(id, i + 1));
    expect(resumeLesson(lessonListens(lessons, items))).toBeNull();
  });
});

describe("ilmuntaMediaUrl", () => {
  it("경로 조각마다 주소용으로 바꾼다", () => {
    expect(ilmuntaMediaUrl("강의 mp3/L01-01.MP3")).toBe(
      "/media/ilmunta/%EA%B0%95%EC%9D%98%20mp3/L01-01.MP3",
    );
  });
});
