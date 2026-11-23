import { describe, expect, it } from "vitest";
import { isPublicPath } from "./public-paths";

describe("isPublicPath", () => {
  it.each([
    "/login",
    "/api/login",
    "/manifest.webmanifest",
    "/icons/icon-192.png",
    "/_next/static/chunks/a.js",
  ])("%s는 로그인 없이 열린다", (p) => {
    expect(isPublicPath(p)).toBe(true);
  });

  it.each([
    "/",
    "/kana",
    "/media/ilmuta/2.%20예문%20mp3/01-1.mp3",
    "/api/progress",
    "/login/../media/x",
    "/sw.js",
  ])("%s는 로그인해야 열린다", (p) => {
    expect(isPublicPath(p)).toBe(false);
  });
});
