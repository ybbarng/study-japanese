import { describe, expect, it } from "vitest";
import { emptyKanaData, introduce } from "./state";
import { adoptFromServer, toVersioned } from "./sync";

const T0 = Date.UTC(2027, 0, 1, 0, 0, 0);

describe("toVersioned", () => {
  it("한 번도 공부하지 않은 빈 상태는 서버에 보내지 않는다", () => {
    expect(toVersioned(emptyKanaData())).toBeNull();
  });

  it("상태와 updatedAt을 함께 싼다", () => {
    const d = introduce(emptyKanaData(), ["hira:a"], T0);
    expect(toVersioned(d)).toEqual({ value: d, updatedAt: T0 });
  });
});

describe("adoptFromServer", () => {
  const local = introduce(emptyKanaData(), ["hira:a"], T0);

  it("서버 문서가 더 새것이면 그 상태를 쓴다", () => {
    const newer = introduce(local, ["hira:i"], T0 + 1000);
    const adopted = adoptFromServer(local, {
      value: newer,
      updatedAt: T0 + 1000,
    });
    expect(Object.keys(adopted?.cards ?? {})).toEqual(["hira:a", "hira:i"]);
  });

  it("서버 문서가 같거나 오래됐으면 바꾸지 않는다", () => {
    expect(adoptFromServer(local, { value: local, updatedAt: T0 })).toBeNull();
    expect(adoptFromServer(local, null)).toBeNull();
  });

  it("모양이 틀린 서버 문서는 버린다", () => {
    expect(
      adoptFromServer(local, { value: { cards: 3 }, updatedAt: T0 + 1 }),
    ).toBeNull();
  });
});
