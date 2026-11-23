import { describe, expect, it } from "vitest";
import { decideSync, syncState } from "./state-sync";

const T = Date.UTC(2027, 0, 3);

describe("decideSync", () => {
  it.each([
    [
      "폰이 더 늦게 고쳤으면 서버로 보낸다",
      { value: 1, updatedAt: T + 1 },
      { value: 0, updatedAt: T },
      "push",
    ],
    [
      "맥에서 더 늦게 고쳤으면 서버 것을 받는다",
      { value: 1, updatedAt: T },
      { value: 2, updatedAt: T + 1 },
      "pull",
    ],
    [
      "시각이 같으면 그대로",
      { value: 1, updatedAt: T },
      { value: 1, updatedAt: T },
      "same",
    ],
    ["서버에 없으면 보낸다", { value: 1, updatedAt: T }, null, "push"],
    [
      "처음 연 기기면 서버 것을 받는다",
      null,
      { value: 1, updatedAt: T },
      "pull",
    ],
  ] as const)("%s", (_, local, server, expected) => {
    expect(decideSync(local, server)).toBe(expected);
  });
});

describe("syncState", () => {
  it("오프라인이면 폰에 있던 문서를 그대로 쓴다", async () => {
    const offline = (() =>
      Promise.reject(new TypeError("Failed to fetch"))) as typeof fetch;
    const local = { value: { learned: ["a"] }, updatedAt: T };
    expect(await syncState("kana", local, offline, true)).toEqual(local);
  });

  it("방문자는 서버에 묻지도 보내지도 않고 자기 브라우저 기록을 쓴다", async () => {
    let called = 0;
    const spy = (async () => {
      called += 1;
      return Response.json(null);
    }) as typeof fetch;
    const local = { value: { learned: ["a"] }, updatedAt: T };
    expect(await syncState("kana", local, spy, false)).toEqual(local);
    expect(called).toBe(0);
  });

  it("서버가 더 새것이면 서버 문서를 돌려준다", async () => {
    const server = {
      key: "kana",
      value: { learned: ["a", "i"] },
      updatedAt: T + 5,
    };
    const fakeFetch = (async () => Response.json(server)) as typeof fetch;
    const result = await syncState(
      "kana",
      { value: { learned: ["a"] }, updatedAt: T },
      fakeFetch,
      true,
    );
    expect(result).toMatchObject({
      value: { learned: ["a", "i"] },
      updatedAt: T + 5,
    });
  });
});
