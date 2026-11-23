import { describe, expect, it } from "vitest";
import { requiresAdmin } from "./access";

describe("requiresAdmin", () => {
  it.each([
    ["GET", "/"],
    ["GET", "/kana/lesson/h1"],
    ["GET", "/ilmuta/3"],
    ["GET", "/media/ilmuta/1.%20음성%20강의/L01.mp3"],
    ["GET", "/api/listen"],
    ["GET", "/api/state/kana"],
    ["GET", "/api/transcripts/ilmuta/L01"],
    ["POST", "/api/login"],
    ["POST", "/api/logout"],
    ["GET", "/songs"],
    ["GET", "/songs/test-song"],
    ["GET", "/api/songs"],
    ["GET", "/api/songs/test-song"],
  ])("%s %s는 누구나", (method, path) => {
    expect(requiresAdmin(method, path)).toBe(false);
  });

  it.each([
    ["POST", "/api/listen"],
    ["PUT", "/api/state/kana"],
    ["PUT", "/api/writings"],
    ["DELETE", "/api/state/kana"],
    ["GET", "/api/export"],
    ["GET", "/settings"],
    ["POST", "/api/settings"],
    ["GET", "/songs/new"],
    ["GET", "/songs/test-song/edit"],
    ["GET", "/songs/test-song/sync"],
    ["PUT", "/api/songs/test-song"],
    ["DELETE", "/api/songs/test-song"],
  ])("%s %s는 관리자만", (method, path) => {
    expect(requiresAdmin(method, path)).toBe(true);
  });

  it("이름이 비슷한 경로를 관리자 경로로 잘못 보지 않는다", () => {
    expect(requiresAdmin("GET", "/settingsx")).toBe(false);
    expect(requiresAdmin("GET", "/api/exports-public")).toBe(false);
    expect(requiresAdmin("GET", "/songs/editor")).toBe(false);
    expect(requiresAdmin("GET", "/songs/a/edit/more")).toBe(false);
  });
});
