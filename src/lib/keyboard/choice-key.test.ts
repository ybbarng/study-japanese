import { describe, expect, it } from "vitest";
import { choiceIndexFor } from "./choice-key";

const key = (k: string, tag = "BODY") => ({
  key: k,
  ctrlKey: false,
  metaKey: false,
  altKey: false,
  isComposing: false,
  target: { tag, editable: false },
});

describe("choiceIndexFor", () => {
  it("1~4 키는 첫째~넷째 보기다", () => {
    expect(choiceIndexFor(key("1"), 4)).toBe(0);
    expect(choiceIndexFor(key("4"), 4)).toBe(3);
  });

  it("보기 수보다 큰 숫자는 고르지 않는다", () => {
    expect(choiceIndexFor(key("5"), 4)).toBeNull();
    expect(choiceIndexFor(key("0"), 4)).toBeNull();
  });

  it("입력칸에 숫자를 칠 때는 고르지 않는다", () => {
    expect(choiceIndexFor(key("1", "INPUT"), 4)).toBeNull();
  });
});
