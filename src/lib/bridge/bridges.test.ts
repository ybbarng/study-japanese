import { describe, expect, it } from "vitest";
import { LESSONS } from "@/lib/kana/lessons";
import { nextBridge, withBridges } from "./bridges";

describe("withBridges", () => {
  it("다리는 열리는 레슨 바로 뒤에 놓인다", () => {
    const ids = withBridges(LESSONS).map((e) =>
      e.kind === "lesson" ? e.lesson.id : e.bridge.id,
    );
    expect(ids.slice(4, 7)).toEqual(["h5", "read-h", "h6"]);
    expect(ids.slice(ids.indexOf("k5"), ids.indexOf("k5") + 3)).toEqual([
      "k5",
      "read-k",
      "k6",
    ]);
  });
});

describe("nextBridge", () => {
  it("히라가나 기본 레슨(h5)을 마치기 전에는 열린 다리가 없다", () => {
    expect(nextBridge(new Set(["h1", "h2", "h3", "h4"]))).toBeNull();
  });

  it("h5를 마치면 히라가나 첫 읽기가 열린다", () => {
    expect(nextBridge(new Set(["h1", "h2", "h3", "h4", "h5"]))?.id).toBe(
      "read-h",
    );
  });

  it("히라가나 첫 읽기를 마쳤고 k5 전이면 열린 다리가 없다", () => {
    expect(nextBridge(new Set(["h5", "read-h", "k4"]))).toBeNull();
  });

  it("k5를 마치면 가타카나 읽기가 열린다", () => {
    expect(nextBridge(new Set(["h5", "read-h", "k5"]))?.id).toBe("read-k");
  });
});
