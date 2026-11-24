import { describe, expect, it } from "vitest";
import { isCrossOriginWrite, requestOrigin } from "./csrf";

const base = {
  method: "POST",
  fetchSite: null,
  origin: null,
  host: "study-ja.example",
};

describe("isCrossOriginWrite", () => {
  it("읽기 요청은 어디서 왔든 막지 않는다", () => {
    expect(
      isCrossOriginWrite({ ...base, method: "GET", fetchSite: "cross-site" }),
    ).toBe(false);
  });

  it.each(["same-origin", "none"])(
    "Sec-Fetch-Site가 %s인 쓰기는 받는다",
    (fetchSite) => {
      expect(isCrossOriginWrite({ ...base, fetchSite })).toBe(false);
    },
  );

  it.each(["same-site", "cross-site"])(
    "Sec-Fetch-Site가 %s인 쓰기는 거절한다(같은 상위 도메인의 다른 사이트 포함)",
    (fetchSite) => {
      expect(isCrossOriginWrite({ ...base, method: "PUT", fetchSite })).toBe(
        true,
      );
    },
  );

  it("Sec-Fetch-Site가 없으면 Origin의 호스트를 견준다", () => {
    expect(
      isCrossOriginWrite({ ...base, origin: "https://study-ja.example" }),
    ).toBe(false);
    expect(
      isCrossOriginWrite({ ...base, origin: "https://other.example" }),
    ).toBe(true);
    expect(isCrossOriginWrite({ ...base, origin: "null" })).toBe(true);
  });

  it("두 머리가 다 없으면(브라우저가 아닌 요청) 막지 않는다", () => {
    expect(isCrossOriginWrite(base)).toBe(false);
  });
});

describe("requestOrigin", () => {
  it("프록시가 넣은 X-Forwarded-Host를 Host보다 먼저 쓴다", () => {
    const headers = new Headers({
      host: "0.0.0.0:3000",
      "x-forwarded-host": "study-ja.example, proxy.internal",
      origin: "https://study-ja.example",
    });
    expect(requestOrigin("POST", headers)).toEqual({
      method: "POST",
      fetchSite: null,
      origin: "https://study-ja.example",
      host: "study-ja.example",
    });
  });
});
