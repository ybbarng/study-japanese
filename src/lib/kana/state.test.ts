import { describe, expect, it } from "vitest";
import { DAY } from "./srs";
import {
  answer,
  completeLesson,
  dayKey,
  emptyKanaData,
  introduce,
  parseKanaData,
  recordBest,
  recordWrite,
  serializeKanaData,
  streak,
} from "./state";

// 2027-01-01 09:00 서울(테스트는 TZ=Asia/Seoul로 돈다)
const T0 = Date.UTC(2027, 0, 1, 0, 0, 0);

describe("상태 바꾸기", () => {
  it("글자를 들이면 카드가 생기고 이미 있는 카드는 그대로 둔다", () => {
    let d = introduce(emptyKanaData(), ["hira:a"], T0);
    d = answer(d, "hira:a", true, T0);
    const before = d.cards["hira:a"];
    d = introduce(d, ["hira:a", "hira:i"], T0 + 1000);
    expect(d.cards["hira:a"]).toBe(before);
    expect(d.cards["hira:i"]?.box).toBe(0);
  });

  it("바꿀 때마다 updatedAt과 공부한 날을 적는다", () => {
    const d = answer(emptyKanaData(), "hira:ka", false, T0);
    expect(d.updatedAt).toBe(T0);
    expect(d.days).toEqual(["2027-01-01"]);
    expect(d.cards["hira:ka"]?.lapses).toBe(1);
  });

  it("레슨을 다시 끝내도 처음 끝낸 시각을 지킨다", () => {
    let d = completeLesson(emptyKanaData(), "h1", T0);
    d = completeLesson(d, "h1", T0 + DAY);
    expect(d.lessons.h1).toBe(T0);
  });

  it("최고 기록은 더 좋을 때만 바뀐다(시간 기록은 작을수록 좋다)", () => {
    let r = recordBest(emptyKanaData(), "rush", 10, T0);
    expect(r.isNew).toBe(true);
    r = recordBest(r.data, "rush", 8, T0);
    expect(r).toMatchObject({ isNew: false, data: { bests: { rush: 10 } } });
    r = recordBest(r.data, "match", 30, T0, false);
    r = recordBest(r.data, "match", 25, T0, false);
    expect(r.data.bests.match).toBe(25);
  });
});

describe("streak", () => {
  it("오늘 안 했으면 어제까지 이어진 날을 센다", () => {
    const d = { ...emptyKanaData(), days: ["2026-12-30", "2026-12-31"] };
    expect(streak(d, T0)).toBe(2);
    expect(dayKey(T0)).toBe("2027-01-01");
  });

  it("하루라도 비면 끊긴다", () => {
    const d = { ...emptyKanaData(), days: ["2026-12-29", "2027-01-01"] };
    expect(streak(d, T0)).toBe(1);
  });
});

describe("내보내기·들여오기", () => {
  it("내보낸 JSON을 들여오면 같은 상태가 된다", () => {
    let d = introduce(emptyKanaData(), ["hira:a", "kata:fa"], T0);
    d = completeLesson(d, "h1", T0);
    d = recordBest(d, "rush", 12, T0).data;
    expect(parseKanaData(serializeKanaData(d))).toEqual(d);
  });

  it("모양이 틀린 JSON은 오류를 던진다", () => {
    expect(() => parseKanaData('{"version":2}')).toThrow();
    expect(() => parseKanaData("not json")).toThrow();
  });

  it("카드 상자 번호가 음수면 오류를 던진다", () => {
    const d = introduce(emptyKanaData(), ["hira:a"], T0);
    const card = d.cards["hira:a"];
    const json = serializeKanaData({
      ...d,
      cards: { "hira:a": { ...card, box: -1 } } as typeof d.cards,
    });
    expect(() => parseKanaData(json)).toThrow("cards.hira:a");
  });

  it("최고 기록이 숫자가 아니면 오류를 던진다", () => {
    const json = JSON.stringify({
      ...emptyKanaData(),
      bests: { rush: "12" },
    });
    expect(() => parseKanaData(json)).toThrow("bests.rush");
  });

  it("모르는 카드 id는 버린다", () => {
    const d = introduce(emptyKanaData(), ["hira:a"], T0);
    const json = serializeKanaData({
      ...d,
      cards: { ...d.cards, "hira:xx": d.cards["hira:a"] } as typeof d.cards,
    });
    expect(Object.keys(parseKanaData(json).cards)).toEqual(["hira:a"]);
  });

  it("써 보기 기록이 내보내기·들여오기를 거쳐도 남는다", () => {
    let d = recordWrite(emptyKanaData(), "hira:a", false, T0);
    d = recordWrite(d, "hira:a", true, T0 + 1000);
    const back = parseKanaData(serializeKanaData(d));
    expect(back.writes).toEqual({
      "hira:a": { done: 2, solo: 1, last: T0 + 1000 },
    });
    expect(back.days).toEqual(["2027-01-01"]);
  });

  it("써 보기가 생기기 전에 저장한 상태(writes 없음)도 읽는다", () => {
    const { writes: _, ...old } = emptyKanaData(T0);
    expect(parseKanaData(JSON.stringify(old)).writes).toEqual({});
  });
});
