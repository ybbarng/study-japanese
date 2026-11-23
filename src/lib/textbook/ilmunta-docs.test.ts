import { describe, expect, it } from "vitest";
import {
  parseIlmuntaBookletHeaders,
  parseIlmuntaPreparation,
  parseIlmuntaSchedule,
} from "./ilmunta-docs";

describe("parseIlmuntaBookletHeaders", () => {
  it("과 머리 줄에서 번호·제목·본책 쪽수를 뽑는다", () => {
    const text = [
      "\f    01    명사의 기본형                                   본 책 023~029쪽",
      "          ～だ             ～じゃない",
      "    12    동사의  기본형  본 책 108~113쪽",
    ].join("\n");
    expect(parseIlmuntaBookletHeaders(text)).toEqual([
      { no: 1, title: "명사의 기본형", pages: { from: 23, to: 29 } },
      { no: 12, title: "동사의 기본형", pages: { from: 108, to: 113 } },
    ]);
  });
});

describe("parseIlmuntaSchedule", () => {
  it("학습일차 줄 뒤의 과 번호 칸을 날짜에 차례로 잇는다", () => {
    const raw = [
      "학습일차 Day11 Day12 Day13",
      "과정",
      "1 1",
      "동사의",
      "기본형",
      "14,15",
      "가형",
      "나형",
      "16①~⑧",
      "다형",
      "페이지 102~ 107 123~ 137 138~ 146",
      "학습일차 Day 14",
      "과정",
      "16⑨~끝",
      "페이지 147~ 154",
      "021",
    ].join("\n");
    expect(Object.fromEntries(parseIlmuntaSchedule(raw))).toEqual({
      11: [11],
      14: [12],
      15: [12],
      16: [13, 14],
    });
  });
});

describe("parseIlmuntaPreparation", () => {
  it("준비마당 칸의 제목과 위아래 줄의 쪽수를 뽑는다", () => {
    const layout = [
      "                  016-                                        096-",
      "준비마당 글자 익히기                                  10 동사의 기본형",
      "                  019                                         101",
    ].join("\n");
    expect(parseIlmuntaPreparation(layout)).toEqual({
      title: "글자 익히기",
      pages: { from: 16, to: 19 },
    });
  });

  it("준비마당이 없으면 undefined", () => {
    expect(parseIlmuntaPreparation("01 명사")).toBeUndefined();
  });
});
