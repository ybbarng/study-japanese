import { describe, expect, it } from "vitest";
import type { CardId } from "./data";
import { LESSONS } from "./lessons";
import { REVIEW_FIRST_AT, todayPlan } from "./plan";
import { DAY, newCard } from "./srs";
import { emptyKanaData, type KanaData } from "./state";

const T0 = Date.UTC(2027, 0, 2, 0, 0, 0); // 서울 2027-01-02 09:00

function withDue(n: number, over: Partial<KanaData> = {}): KanaData {
  const ids: CardId[] = ["a", "i", "u", "e", "o", "ka", "ki", "ku", "ke", "ko"]
    .slice(0, n)
    .map((x) => `hira:${x}` as CardId);
  const cards = Object.fromEntries(ids.map((id) => [id, newCard(T0 - DAY)]));
  return { ...emptyKanaData(), cards, ...over };
}

describe("todayPlan", () => {
  it("처음에는 첫 레슨을 권한다", () => {
    expect(todayPlan(emptyKanaData(), T0)).toMatchObject({
      kind: "lesson",
      lesson: { id: "h1" },
    });
  });

  it("복습이 많이 쌓이면 다음 레슨보다 복습을 먼저 권한다", () => {
    const plan = todayPlan(
      withDue(REVIEW_FIRST_AT, { lessons: { h1: T0 - 2 * DAY } }),
      T0,
    );
    expect(plan).toMatchObject({ kind: "review", due: REVIEW_FIRST_AT });
  });

  it("복습이 조금이고 오늘 레슨을 안 했으면 다음 레슨을 권한다", () => {
    const plan = todayPlan(withDue(2, { lessons: { h1: T0 - 2 * DAY } }), T0);
    expect(plan).toMatchObject({ kind: "lesson", lesson: { id: "h2" } });
  });

  it("오늘 레슨을 이미 끝냈으면 남은 복습을 권한다", () => {
    const plan = todayPlan(withDue(2, { lessons: { h1: T0 - 1000 } }), T0);
    expect(plan.kind).toBe("review");
  });

  it("레슨을 다 끝내고 복습도 없으면 게임을 권한다", () => {
    const lessons = Object.fromEntries(
      LESSONS.map((l) => [l.id, T0 - 3 * DAY]),
    );
    expect(todayPlan({ ...emptyKanaData(), lessons }, T0).kind).toBe("game");
  });
});
