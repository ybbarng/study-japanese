import { describe, expect, it } from "vitest";
import {
  adoptFromServer,
  emptyDrillData,
  recordAnswer,
  recordBest,
  toVersioned,
} from "./drill-state";

const NOW = new Date(2027, 3, 2, 21, 0).getTime();

describe("recordAnswer", () => {
  it("처음 본 기술을 맞히면 상자가 1로 오르고 공부한 날이 남는다", () => {
    const d = recordAnswer(emptyDrillData(), "verb:te:godan", true, NOW);
    expect(d.skills["verb:te:godan"].box).toBe(1);
    expect(d.updatedAt).toBe(NOW);
    expect(d.days).toEqual(["2027-04-02"]);
  });

  it("틀리면 상자 0으로 내려가고 틀린 횟수가 는다", () => {
    let d = recordAnswer(emptyDrillData(), "verb:te:godan", true, NOW);
    d = recordAnswer(d, "verb:te:godan", false, NOW + 1000);
    expect(d.skills["verb:te:godan"]).toMatchObject({
      box: 0,
      lapses: 1,
      reps: 2,
    });
  });
});

describe("recordBest", () => {
  it("기록을 넘을 때만 바꾼다", () => {
    const first = recordBest(emptyDrillData(), "streak", 5, NOW);
    expect(first.isNew).toBe(true);
    expect(first.data.bests.streak).toBe(5);
    const lower = recordBest(first.data, "streak", 3, NOW + 1);
    expect(lower.isNew).toBe(false);
    expect(lower.data.bests.streak).toBe(5);
  });
});

describe("서버 동기화", () => {
  it("한 번도 안 한 빈 상태는 보내지 않는다", () => {
    expect(toVersioned(emptyDrillData())).toBeNull();
  });

  it("서버 문서가 더 새것이고 모양이 맞으면 받아들인다", () => {
    const server = recordAnswer(
      emptyDrillData(),
      "verb:nai:kuru",
      true,
      NOW + 5000,
    );
    const adopted = adoptFromServer(emptyDrillData(), toVersioned(server));
    expect(adopted?.skills["verb:nai:kuru"].box).toBe(1);
  });

  it("모양이 틀린 서버 문서는 버린다", () => {
    expect(
      adoptFromServer(emptyDrillData(), {
        value: { skills: 3 },
        updatedAt: NOW,
      }),
    ).toBeNull();
  });

  it("이 기기 것이 더 새것이면 받지 않는다", () => {
    const local = recordAnswer(
      emptyDrillData(),
      "verb:nai:kuru",
      true,
      NOW + 9000,
    );
    const server = recordAnswer(emptyDrillData(), "verb:nai:kuru", false, NOW);
    expect(adoptFromServer(local, toVersioned(server))).toBeNull();
  });
});
