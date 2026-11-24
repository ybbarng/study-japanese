import { describe, expect, it } from "vitest";
import type { ItemSummary } from "@/lib/store/listen";
import { fakeLesson } from "./__fixtures__/lesson";
import { isWeekendKst, pendingWriting, pickContinue } from "./continue";
import {
  indexListens,
  type LessonProgress,
  lectureTally,
  lessonProgress,
} from "./progress";

function summary(
  item: string,
  plays: number,
  completedPlays: number,
): ItemSummary {
  return {
    item,
    kind: item.startsWith("L") ? "lecture" : "example",
    plays,
    completedPlays,
    listenedSec: 10,
    lastAt: 1,
  };
}

describe("강 하나의 들은 정도", () => {
  const listens = indexListens([
    summary("L01", 2, 1),
    summary("01-2", 3, 2),
    summary("01-3", 1, 0),
  ]);

  it("강의는 끝까지 들은 적이 있어야 들은 것으로 본다", () => {
    const p = lessonProgress(fakeLesson(1), listens, 0);
    expect([p.lectureDone, p.lecturePlays]).toEqual([true, 2]);
  });

  it("예문은 끝까지 들은 것만 센다", () => {
    const p = lessonProgress(fakeLesson(1), listens, 0);
    expect([p.examplesHeard, p.examplesTotal]).toEqual([1, 6]);
    expect(p.pips).toEqual([true, false, true, false, false, false, false]);
  });

  it("문장 3개를 써야 쓰기를 마친 것이다", () => {
    expect(lessonProgress(fakeLesson(1), listens, 2).writingDone).toBe(false);
    expect(lessonProgress(fakeLesson(1), listens, 3).writingDone).toBe(true);
  });

  it("0강(오리엔테이션)은 쓰지 않아도 마친 것이다", () => {
    expect(lessonProgress(fakeLesson(0), {}, 0).writingDone).toBe(true);
  });
});

function prog(
  no: number,
  lectureDone: boolean,
  writingDone: boolean,
): LessonProgress {
  return {
    no,
    lectureDone,
    lecturePlays: lectureDone ? 1 : 0,
    examplesHeard: 0,
    examplesTotal: 6,
    pips: [],
    written: writingDone ? 3 : 0,
    writingDone,
  };
}

const WEDNESDAY = Date.UTC(2027, 0, 6, 0, 0); // 2027-01-06 수 09:00 KST
const SATURDAY = Date.UTC(2027, 0, 9, 0, 0); // 2027-01-09 토 09:00 KST

describe("한국 시각으로 주말인지", () => {
  it("UTC로 금요일 밤 15시는 한국 토요일 0시라 주말이다", () => {
    expect(isWeekendKst(Date.UTC(2027, 0, 8, 15, 0))).toBe(true);
  });

  it("UTC로 일요일 15시는 한국 월요일이라 평일이다", () => {
    expect(isWeekendKst(Date.UTC(2027, 0, 10, 15, 0))).toBe(false);
  });
});

describe("이어서 할 강 고르기", () => {
  const progress = [
    prog(0, true, true),
    prog(1, true, false),
    prog(2, true, false),
    prog(3, false, false),
  ];

  it("평일에는 강의를 아직 듣지 않은 첫 강을 고른다", () => {
    expect(pickContinue(progress, WEDNESDAY)).toEqual({
      kind: "listen",
      no: 3,
    });
  });

  it("주말에는 문장을 아직 쓰지 않은 첫 강을 고른다", () => {
    expect(pickContinue(progress, SATURDAY)).toEqual({ kind: "write", no: 1 });
  });

  it("주말이어도 밀린 쓰기가 없으면 다음 강을 듣는다", () => {
    expect(
      pickContinue([prog(0, true, true), prog(1, false, false)], SATURDAY),
    ).toEqual({
      kind: "listen",
      no: 1,
    });
  });

  it("모두 들었으면 평일에도 밀린 쓰기를 고른다", () => {
    expect(
      pickContinue([prog(0, true, true), prog(1, true, false)], WEDNESDAY),
    ).toEqual({
      kind: "write",
      no: 1,
    });
  });

  it("다 들고 다 썼으면 끝", () => {
    expect(
      pickContinue([prog(0, true, true), prog(1, true, true)], WEDNESDAY),
    ).toEqual({
      kind: "done",
    });
  });

  it("처음 시작하면 0강부터", () => {
    expect(
      pickContinue([prog(1, false, false), prog(0, false, true)], WEDNESDAY),
    ).toEqual({
      kind: "listen",
      no: 0,
    });
  });

  it("밀린 쓰기는 강의를 들은 강만 센다", () => {
    expect(pendingWriting(progress)).toEqual([1, 2]);
  });
});

describe("강의 들은 강 수", () => {
  it("0강은 들었어도 세지 않고 전체 수에서도 뺀다", () => {
    const rows = [
      { no: 0, lectureDone: true },
      { no: 1, lectureDone: true },
      { no: 2, lectureDone: false },
    ];
    expect(lectureTally(rows)).toEqual({ done: 1, total: 2 });
  });
});
