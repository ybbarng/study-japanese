import { describe, expect, it } from "vitest";
import { guessDevice } from "./device";
import { typedKind } from "./japanese";

const UA = {
  android:
    "Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Mobile Safari/537.36",
  windows:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36",
  mac: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36",
  iphone:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
  linux:
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36",
};

describe("기기 짐작", () => {
  it("안드로이드 Chrome은 안드로이드다", () => {
    expect(guessDevice(UA.android)).toBe("android");
  });
  it("윈도우 Chrome은 윈도우다", () => {
    expect(guessDevice(UA.windows)).toBe("windows");
  });
  it("맥 Chrome은 맥이다", () => {
    expect(guessDevice(UA.mac)).toBe("mac");
  });
  it("아이폰은 맥이 아니라 아이폰이다(userAgent에 Mac OS X가 들어 있어도)", () => {
    expect(guessDevice(UA.iphone)).toBe("ios");
  });
  it("모르는 기기는 null이다", () => {
    expect(guessDevice(UA.linux)).toBeNull();
  });
});

describe("들어온 글자 종류", () => {
  it("히라가나가 들어오면 일본어다", () => {
    expect(typedKind("にほんご")).toBe("japanese");
  });
  it("가타카나와 장음 기호도 일본어다", () => {
    expect(typedKind("コーヒー")).toBe("japanese");
  });
  it("한자로 바꾼 글도 일본어다", () => {
    expect(typedKind("日本語")).toBe("japanese");
  });
  it("로마자만 들어오면 입력기가 영문 상태다", () => {
    expect(typedKind("nihongo")).toBe("latin");
  });
  it("한글은 그 밖의 글자다", () => {
    expect(typedKind("니혼고")).toBe("other");
  });
  it("빈칸만 있으면 비었다", () => {
    expect(typedKind("  ")).toBe("empty");
  });
});
