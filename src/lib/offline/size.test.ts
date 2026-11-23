import { describe, expect, it } from "vitest";
import { declaredSize, formatBytes, sumBytes } from "./size";

const MB = 1024 * 1024;

describe("크기 글", () => {
  it("10MB 아래는 소수 한 자리로 보인다", () => {
    expect(formatBytes(8.14 * MB)).toBe("8.1MB");
  });

  it("10MB 이상은 정수로 보인다", () => {
    expect(formatBytes(23.4 * MB)).toBe("23MB");
  });

  it("아주 작아도 0.1MB로 보여 받은 것이 있음을 알린다", () => {
    expect(formatBytes(2000)).toBe("0.1MB");
  });

  it("1GB 이상은 GB로 보인다", () => {
    expect(formatBytes(1.24 * 1024 * MB)).toBe("1.2GB");
  });

  it("0이나 잘못된 값은 0MB다", () => {
    expect(formatBytes(0)).toBe("0MB");
    expect(formatBytes(Number.NaN)).toBe("0MB");
  });
});

describe("크기 합계", () => {
  it("잘못된 값은 빼고 더한다", () => {
    expect(sumBytes([100, Number.NaN, -5, 50])).toBe(150);
  });
});

describe("응답에 적힌 크기", () => {
  it("Content-Length를 숫자로 읽는다", () => {
    expect(declaredSize(new Headers({ "Content-Length": "4096" }))).toBe(4096);
  });

  it("없거나 숫자가 아니면 null이다", () => {
    expect(declaredSize(new Headers())).toBeNull();
    expect(declaredSize(new Headers({ "Content-Length": "abc" }))).toBeNull();
  });
});
