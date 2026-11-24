import { describe, expect, it } from "vitest";
import { DAY, MINUTE } from "@/lib/kana/srs";
import { activeQuiz } from "./active";
import {
  adoptFromServer,
  dueByLesson,
  dueKeys,
  emptyQuizData,
  recordQuizAnswer,
} from "./review-state";

const T0 = Date.UTC(2027, 0, 5, 9);

describe("recordQuizAnswer", () => {
  it("처음 보는 문제를 맞히면 남기지 않는다", () => {
    const d = recordQuizAnswer(
      emptyQuizData(),
      "L1:w:meaning:01-2#0",
      true,
      T0,
    );
    expect(d.cards).toEqual({});
    expect(d.updatedAt).toBe(0);
  });

  it("틀린 문제는 카드로 남기고 10분 뒤 다시 낼 때가 된다", () => {
    const d = recordQuizAnswer(
      emptyQuizData(),
      "L1:w:meaning:01-2#0",
      false,
      T0,
    );
    expect(dueKeys(d, T0 + 5 * MINUTE)).toEqual([]);
    expect(dueKeys(d, T0 + 11 * MINUTE)).toEqual(["L1:w:meaning:01-2#0"]);
  });

  it("틀린 뒤 맞히면 다음 상자로 올라가 하루 뒤로 미뤄진다", () => {
    const key = "L1:p:blank:01-3#4";
    let d = recordQuizAnswer(emptyQuizData(), key, false, T0);
    d = recordQuizAnswer(d, key, true, T0 + 11 * MINUTE);
    expect(dueKeys(d, T0 + 12 * MINUTE)).toEqual([]);
    expect(dueKeys(d, T0 + 11 * MINUTE + DAY)).toEqual([key]);
  });
});

describe("dueByLesson", () => {
  it("강마다 다시 낼 문제 수를 강 차례로 센다", () => {
    let d = emptyQuizData();
    for (const k of [
      "L5:w:meaning:05-2#0",
      "L1:w:reading:01-2#1",
      "L5:c:say:05-4-1#3",
    ])
      d = recordQuizAnswer(d, k, false, T0);
    expect(dueByLesson(d, T0 + DAY)).toEqual([
      { lesson: 1, count: 1 },
      { lesson: 5, count: 2 },
    ]);
  });
});

describe("adoptFromServer", () => {
  it("서버 문서가 더 새것이고 모양이 맞을 때만 받는다", () => {
    const local = recordQuizAnswer(
      emptyQuizData(),
      "L1:w:meaning:01-2#0",
      false,
      T0,
    );
    expect(
      adoptFromServer(local, { value: { bad: 1 }, updatedAt: T0 + 1 }),
    ).toBeNull();
    expect(
      adoptFromServer(local, {
        value: emptyQuizData(T0 - 1),
        updatedAt: T0 - 1,
      }),
    ).toBeNull();
    expect(
      adoptFromServer(local, {
        value: emptyQuizData(T0 + 1),
        updatedAt: T0 + 1,
      }),
    ).toEqual(emptyQuizData(T0 + 1));
  });
});

describe("activeQuiz", () => {
  const view = { height: 800, coveredTop: 120 };
  it("초점이 든 묶음을 먼저 고른다", () => {
    expect(
      activeQuiz(
        [
          { top: 200, bottom: 400, focused: false, open: true },
          { top: 2000, bottom: 2400, focused: true, open: true },
        ],
        view,
      ),
    ).toBe(1);
  });
  it("초점이 없으면 위에 붙은 재생기 아래로 보이는 풀 문제가 남은 묶음 중 맨 위", () => {
    expect(
      activeQuiz(
        [
          { top: -400, bottom: 100, focused: false, open: true },
          { top: 300, bottom: 600, focused: false, open: false },
          { top: 650, bottom: 900, focused: false, open: true },
        ],
        view,
      ),
    ).toBe(2);
  });
  it("보이는 묶음이 없으면 -1", () => {
    expect(
      activeQuiz(
        [{ top: 1000, bottom: 1300, focused: false, open: true }],
        view,
      ),
    ).toBe(-1);
  });
});
