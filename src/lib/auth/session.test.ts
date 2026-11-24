import { describe, expect, it } from "vitest";
import {
  createSessionToken,
  passwordMatches,
  timingSafeEqual,
  verifySessionToken,
} from "./session";

const SECRET = "test-secret-at-least-32-characters-long";
const NOW = Date.UTC(2026, 11, 1);

describe("verifySessionToken", () => {
  it("같은 비밀로 만든 만료 전 토큰을 받아들인다", async () => {
    const token = await createSessionToken(SECRET, NOW, 1000);
    expect(await verifySessionToken(token, SECRET, NOW + 999)).toBe(true);
  });

  it("만료 시각이 지난 토큰을 거절한다", async () => {
    const token = await createSessionToken(SECRET, NOW, 1000);
    expect(await verifySessionToken(token, SECRET, NOW + 1000)).toBe(false);
  });

  it("다른 비밀로 만든 토큰을 거절한다", async () => {
    const token = await createSessionToken(
      "another-secret-of-similar-length!!",
      NOW,
      1000,
    );
    expect(await verifySessionToken(token, SECRET, NOW)).toBe(false);
  });

  it("만료 시각을 늘려 고친 토큰을 거절한다", async () => {
    const token = await createSessionToken(SECRET, NOW, 1000);
    const [, mac] = token.split(".");
    expect(
      await verifySessionToken(`${NOW + 10_000_000}.${mac}`, SECRET, NOW),
    ).toBe(false);
  });

  it.each([undefined, "", "abc", ".mac", "12x.mac"])(
    "모양이 틀린 토큰 %j를 거절한다",
    async (token) => {
      expect(await verifySessionToken(token, SECRET, NOW)).toBe(false);
    },
  );
});

describe("timingSafeEqual", () => {
  it("같은 글은 true, 한 글자라도 다르거나 길이가 다르면 false", () => {
    expect(timingSafeEqual("abc", "abc")).toBe(true);
    expect(timingSafeEqual("abc", "abd")).toBe(false);
    expect(timingSafeEqual("abc", "abcd")).toBe(false);
  });
});

describe("passwordMatches", () => {
  const PASSWORD = "correct horse battery staple";

  it("같은 암호면 true", async () => {
    expect(await passwordMatches(PASSWORD, PASSWORD)).toBe(true);
  });

  it.each(["", "correct horse battery stapl", `${PASSWORD} `, "CORRECT"])(
    "다른 암호 %j면 길이와 상관없이 false",
    async (input) => {
      expect(await passwordMatches(input, PASSWORD)).toBe(false);
    },
  );
});
