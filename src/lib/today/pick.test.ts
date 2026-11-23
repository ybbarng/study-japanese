import { describe, expect, it } from "vitest";
import { BRIDGES } from "@/lib/bridge/bridges";
import type { CardId } from "@/lib/kana/data";
import { LESSONS } from "@/lib/kana/lessons";
import { todayPlan } from "@/lib/kana/plan";
import { DAY, newCard } from "@/lib/kana/srs";
import { emptyKanaData, type KanaData } from "@/lib/kana/state";
import { actionHref } from "./actions";
import { pickToday, type TodayInput } from "./pick";

const kst = (iso: string) => Date.parse(`${iso}+09:00`);

function kanaInput(data: KanaData, nowMs: number): TodayInput["kana"] {
  return {
    plan: todayPlan(data, nowMs),
    lessonsDone: LESSONS.filter((l) => data.lessons[l.id]).length,
  };
}

/** 가나 레슨·첫 읽기를 모두 끝내고 복습할 것도 없는 상태 */
function kanaAllDone(nowMs: number): KanaData {
  const lessons = Object.fromEntries(
    [...LESSONS.map((l) => l.id), ...BRIDGES.map((b) => b.id)].map((id) => [
      id,
      nowMs - 10 * DAY,
    ]),
  );
  return { ...emptyKanaData(), lessons };
}

/** 가나를 다 끝냈는데 복습할 글자가 n개 쌓인 상태 */
function kanaAllDoneWithDue(nowMs: number, n: number): KanaData {
  const ids = ["a", "i", "u", "e", "o"].slice(0, n);
  const cards = Object.fromEntries(
    ids.map((x) => [`hira:${x}` as CardId, newCard(nowMs - DAY)]),
  );
  return { ...kanaAllDone(nowMs), cards };
}

/** 일무따 0..lastDone강 강의를 들었고, pending강은 문장이 남았다 */
function ilmuta(
  lastDone: number,
  pick: NonNullable<TodayInput["ilmuta"]>["pick"],
  pending: number[] = [],
): TodayInput["ilmuta"] {
  const done = new Set(Array.from({ length: lastDone + 1 }, (_, i) => i));
  return {
    pick,
    lectureDone: done,
    nextListen: lastDone >= 60 ? null : lastDone + 1,
    pendingWriting: pending,
  };
}

const NOTHING_HEARD: TodayInput["ilmuta"] = {
  pick: { kind: "listen", no: 0 },
  lectureDone: new Set(),
  nextListen: 0,
  pendingWriting: [],
};
const ILMUNTA_FRESH: TodayInput["ilmunta"] = { resume: 1, done: new Set() };

describe("pickToday — 시작 전", () => {
  it("12월 31일 밤에는 D-1 시작 전 화면이다", () => {
    const now = kst("2026-12-31T22:00");
    expect(
      pickToday({
        nowMs: now,
        kana: kanaInput(emptyKanaData(), now),
        ilmuta: NOTHING_HEARD,
        ilmunta: ILMUNTA_FRESH,
      }),
    ).toEqual({ phase: "before", daysLeft: 1 });
  });

  it("미리 들어 본 기록이 있어도 1월 1일 전에는 시작 전 화면이다", () => {
    const now = kst("2026-12-20T09:00");
    const today = pickToday({
      nowMs: now,
      kana: kanaInput({ ...emptyKanaData(), lessons: { h1: now } }, now),
      ilmuta: ilmuta(2, { kind: "listen", no: 3 }),
      ilmunta: ILMUNTA_FRESH,
    });
    expect(today).toEqual({ phase: "before", daysLeft: 12 });
  });
});

describe("pickToday — 1월 1일 아침", () => {
  const now = kst("2027-01-01T08:00");
  const today = pickToday({
    nowMs: now,
    kana: kanaInput(emptyKanaData(), now),
    ilmuta: NOTHING_HEARD,
    ilmunta: ILMUNTA_FRESH,
  });

  it("가장 큰 단추는 일무따 0강 듣기와 가나 첫 레슨 둘이다", () => {
    expect(today.phase === "study" && today.main).toEqual([
      { kind: "ilmuta-listen", no: 0 },
      { kind: "kana-lesson", lessonId: "h1", first: true },
    ]);
  });

  it("0강 듣기는 0강 화면으로, 가나 첫 레슨은 h1 레슨으로 간다", () => {
    if (today.phase !== "study") throw new Error("시작 뒤여야 한다");
    expect(today.main.map(actionHref)).toEqual([
      "/ilmuta/0",
      "/kana/lesson/h1",
    ]);
  });

  it("이번 달 목표는 일무따 0~18강, 하루 1강이다", () => {
    expect(today.phase === "study" && today.quota).toMatchObject({
      goal: { book: "ilmuta", from: 0, to: 18 },
      done: 0,
      perDay: 1,
    });
  });

  it("1월 1일은 금요일이라 주말이 아니다", () => {
    expect(today.phase === "study" && today.weekend).toBe(false);
  });
});

describe("pickToday — 1월 중순", () => {
  it("평일에는 다음 강 듣기가 가장 크고, 가나를 다 익혔으면 가나는 크게 두지 않는다", () => {
    const now = kst("2027-01-13T08:00"); // 수요일
    const today = pickToday({
      nowMs: now,
      kana: kanaInput(kanaAllDone(now), now),
      ilmuta: ilmuta(9, { kind: "listen", no: 10 }, [8, 9]),
      ilmunta: ILMUNTA_FRESH,
    });
    expect(today).toMatchObject({
      phase: "study",
      weekend: false,
      main: [{ kind: "ilmuta-listen", no: 10 }],
      rest: [],
      quota: { done: 10, remaining: 9, daysLeft: 19, perDay: 1 },
    });
  });

  it("평일에 가나 복습이 쌓였으면 오늘의 나머지에 둔다", () => {
    const now = kst("2027-01-13T08:00");
    const today = pickToday({
      nowMs: now,
      kana: kanaInput(kanaAllDoneWithDue(now, 3), now),
      ilmuta: ilmuta(9, { kind: "listen", no: 10 }),
      ilmunta: ILMUNTA_FRESH,
    });
    expect(today.phase === "study" && today.rest).toEqual([
      { kind: "kana-review", due: 3 },
    ]);
  });

  it("주말에는 밀린 문장 쓰기가 가장 크고, 다음 강 듣기는 곁에 둔다", () => {
    const now = kst("2027-01-16T10:00"); // 토요일
    const today = pickToday({
      nowMs: now,
      kana: kanaInput(kanaAllDone(now), now),
      ilmuta: ilmuta(12, { kind: "write", no: 8 }, [8, 9]),
      ilmunta: ILMUNTA_FRESH,
    });
    expect(today).toMatchObject({
      weekend: true,
      main: [{ kind: "ilmuta-write", no: 8 }],
      rest: [{ kind: "ilmuta-listen", no: 13 }],
    });
  });

  it("가나 h5를 마친 날에는 일무따 곁에 첫 읽기를 크게 둔다", () => {
    const now = kst("2027-01-04T20:00");
    const lessons = Object.fromEntries(
      ["h1", "h2", "h3", "h4", "h5"].map((id) => [id, now - 1000]),
    );
    const today = pickToday({
      nowMs: now,
      kana: kanaInput({ ...emptyKanaData(), lessons }, now),
      ilmuta: ilmuta(3, { kind: "listen", no: 4 }),
      ilmunta: ILMUNTA_FRESH,
    });
    expect(today.phase === "study" && today.main).toEqual([
      { kind: "ilmuta-listen", no: 4 },
      { kind: "kana-bridge", bridgeId: "read-h" },
    ]);
  });
});

describe("pickToday — 월말·분기 경계", () => {
  it("1월 31일 밤에는 이달 남은 강을 모두 오늘 몫으로 보인다", () => {
    const now = kst("2027-01-31T21:00"); // 일요일
    const today = pickToday({
      nowMs: now,
      kana: kanaInput(kanaAllDone(now), now),
      ilmuta: ilmuta(15, { kind: "listen", no: 16 }),
      ilmunta: ILMUNTA_FRESH,
    });
    expect(today.phase === "study" && today.quota).toMatchObject({
      remaining: 3,
      daysLeft: 1,
      perDay: 3,
    });
  });

  it("2월 1일 0시가 되면 목표가 19~38강으로 바뀐다", () => {
    const now = kst("2027-02-01T00:00");
    const today = pickToday({
      nowMs: now,
      kana: kanaInput(kanaAllDone(now), now),
      ilmuta: ilmuta(18, { kind: "listen", no: 19 }),
      ilmunta: ILMUNTA_FRESH,
    });
    expect(today.phase === "study" && today.quota).toMatchObject({
      goal: { from: 19, to: 38 },
      done: 0,
      daysLeft: 28,
    });
  });

  it("1분기에 일무따 60강을 다 끝냈으면 일문따가 가장 크다", () => {
    const now = kst("2027-03-25T08:00");
    const today = pickToday({
      nowMs: now,
      kana: kanaInput(kanaAllDone(now), now),
      ilmuta: ilmuta(60, { kind: "done" }),
      ilmunta: ILMUNTA_FRESH,
    });
    expect(today.phase === "study" && today.main).toEqual([
      { kind: "ilmunta", no: 1 },
    ]);
  });
});

describe("pickToday — 2분기(4월)", () => {
  it("일문따 이어 듣기가 가장 크고, 활용 드릴과 덜 끝낸 일무따는 곁에 둔다", () => {
    const now = kst("2027-04-07T08:00"); // 수요일
    const today = pickToday({
      nowMs: now,
      kana: kanaInput(kanaAllDone(now), now),
      ilmuta: ilmuta(57, { kind: "listen", no: 58 }),
      ilmunta: { resume: 5, done: new Set([1, 2, 3, 4]) },
    });
    expect(today).toMatchObject({
      phase: "study",
      main: [{ kind: "ilmunta", no: 5 }],
      rest: [{ kind: "ilmuta-listen", no: 58 }, { kind: "ilmunta-drill" }],
      quota: {
        goal: { book: "ilmunta", from: 1, to: 24 },
        done: 4,
        daysLeft: 24,
        perDay: 1,
      },
    });
  });

  it("7월부터는 달 목표가 없다", () => {
    const now = kst("2027-07-01T08:00");
    const today = pickToday({
      nowMs: now,
      kana: kanaInput(kanaAllDone(now), now),
      ilmuta: ilmuta(60, { kind: "done" }),
      ilmunta: { resume: null, done: new Set() },
    });
    expect(today.phase === "study" && today.quota).toBeNull();
  });
});

describe("pickToday — 교재가 없을 때", () => {
  it("교재 데이터가 없으면 가나만 크게 보인다", () => {
    const now = kst("2027-01-01T08:00");
    const today = pickToday({
      nowMs: now,
      kana: kanaInput(emptyKanaData(), now),
      ilmuta: null,
      ilmunta: null,
    });
    expect(today).toMatchObject({
      main: [{ kind: "kana-lesson", lessonId: "h1" }],
      quota: null,
    });
  });
});
