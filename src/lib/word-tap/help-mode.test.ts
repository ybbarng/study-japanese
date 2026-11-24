import { describe, expect, it } from "vitest";
import { charHelpMode } from "./help-mode";

describe("charHelpMode", () => {
  it("5강까지는 가나를 다 익혔어도 펼친다", () => {
    expect(charHelpMode(1, true)).toBe("open");
    expect(charHelpMode(5, true)).toBe("open");
  });

  it("6~10강은 가나 레슨을 덜 끝냈을 때만 펼친다", () => {
    expect(charHelpMode(6, false)).toBe("open");
    expect(charHelpMode(10, false)).toBe("open");
    expect(charHelpMode(6, true)).toBe("tap");
    expect(charHelpMode(10, true)).toBe("tap");
  });

  it("11강부터는 가나와 상관없이 눌러야 보인다", () => {
    expect(charHelpMode(11, false)).toBe("tap");
    expect(charHelpMode(40, false)).toBe("tap");
  });
});
