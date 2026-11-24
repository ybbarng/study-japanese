import { describe, expect, it } from "vitest";
import { orderable, orderChunks } from "./order";

describe("orderChunks", () => {
  it("낱말 뒤 조사·조동사를 앞 낱말에 붙여 조각으로 묶고 끝 문장부호를 뗀다", () => {
    const r = orderChunks("ねこは川でねる。", [
      { surface: "ねこ", pos: "名詞" },
      { surface: "は", pos: "助詞" },
      { surface: "川", pos: "名詞" },
      { surface: "で", pos: "助詞" },
      { surface: "ね", pos: "動詞" },
      { surface: "る", pos: "助動詞" },
      { surface: "。", plain: true },
    ]);
    expect(r).toEqual({ chunks: ["ねこは", "川で", "ねる"], tail: "。" });
  });
  it("접두사는 뒤 낱말에, 쉼표는 앞 조각에 붙인다", () => {
    const r = orderChunks("うん、お茶をのむ？", [
      { surface: "うん", pos: "感動詞" },
      { surface: "、", plain: true },
      { surface: "お", pos: "接頭辞" },
      { surface: "茶", pos: "名詞" },
      { surface: "を", pos: "助詞" },
      { surface: "のむ", pos: "動詞" },
      { surface: "？", plain: true },
    ]);
    expect(r).toEqual({ chunks: ["うん、", "お茶を", "のむ"], tail: "？" });
  });
  it("조각을 이어 원래 문장이 되지 않으면 null", () => {
    expect(orderChunks("川だ。", [{ surface: "山", pos: "名詞" }])).toBeNull();
  });
});

describe("orderable", () => {
  it("조각이 3~6개이고 같은 조각이 없을 때만 낸다", () => {
    expect(orderable(["a", "b"])).toBe(false);
    expect(orderable(["a", "b", "c"])).toBe(true);
    expect(orderable(["a", "b", "a"])).toBe(false);
    expect(orderable(["1", "2", "3", "4", "5", "6", "7"])).toBe(false);
  });
});
