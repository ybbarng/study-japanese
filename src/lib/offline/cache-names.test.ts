import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  AUDIO_CACHE,
  DATA_CACHE,
  PAGE_CACHE,
  PICTURE_CACHE,
  STATIC_CACHE,
} from "./cache-names";

const sw = readFileSync(
  path.join(__dirname, "..", "..", "..", "public", "sw.js"),
  "utf8",
);

function swConstant(name: string): string | undefined {
  return new RegExp(`const ${name} = "([^"]+)"`).exec(sw)?.[1];
}

describe("캐시 이름", () => {
  it("앱이 오디오를 넣는 캐시는 service worker가 꺼내는 캐시와 같다", () => {
    expect(swConstant("AUDIO_CACHE")).toBe(AUDIO_CACHE);
  });

  it("앱이 화면을 넣는 캐시는 service worker가 끊겼을 때 여는 캐시와 같다", () => {
    expect(swConstant("PAGE_CACHE")).toBe(PAGE_CACHE);
  });

  it("앱이 빌드 파일을 넣는 캐시는 service worker의 빌드 파일 캐시와 같다", () => {
    expect(swConstant("STATIC_CACHE")).toBe(STATIC_CACHE);
  });

  it("앱이 그림을 넣는 캐시는 service worker가 그림을 꺼내는 캐시와 같다", () => {
    expect(swConstant("PICTURE_CACHE")).toBe(PICTURE_CACHE);
  });

  it("앱이 자막을 넣는 캐시는 service worker가 끊겼을 때 자막을 꺼내는 캐시와 같다", () => {
    expect(swConstant("DATA_CACHE")).toBe(DATA_CACHE);
  });
});
