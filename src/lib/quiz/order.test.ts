import { describe, expect, it } from "vitest";
import type { ShownToken } from "@/lib/songs/analysis";
import { orderAccepted, orderable, orderChunks, orderShape } from "./order";

const texts = (r: ReturnType<typeof orderChunks>) =>
  r ? { chunks: r.chunks.map((c) => c.text), tail: r.tail } : null;

/** 가짜 문장: 학교까지 자전거로 가다(낱말 분석 꼴) */
const BIKE: ShownToken[] = [
  { surface: "がっこう", pos: "名詞" },
  { surface: "まで", pos: "助詞" },
  { surface: "じてんしゃ", pos: "名詞" },
  { surface: "で", pos: "助詞" },
  { surface: "行", reading: "い", pos: "動詞" },
  { surface: "く", pos: "助動詞" },
  { surface: "。", plain: true },
];

describe("orderChunks", () => {
  it("낱말 뒤 조사·조동사를 앞 낱말에 붙여 조각으로 묶고 끝 문장부호를 뗀다", () => {
    expect(texts(orderChunks("がっこうまでじてんしゃで行く。", BIKE))).toEqual({
      chunks: ["がっこうまで", "じてんしゃで", "行く"],
      tail: "。",
    });
  });
  it("조각마다 후리가나를 달 낱말 조각을 남긴다", () => {
    const r = orderChunks("がっこうまでじてんしゃで行く。", BIKE);
    expect(r?.chunks[2].tokens).toEqual([
      { surface: "行", reading: "い" },
      { surface: "く", reading: undefined },
    ]);
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
    expect(texts(r)).toEqual({
      chunks: ["うん、", "お茶を", "のむ"],
      tail: "？",
    });
  });
  it("조각을 이어 원래 문장이 되지 않으면 null", () => {
    expect(orderChunks("川だ。", [{ surface: "山", pos: "名詞" }])).toBeNull();
  });
});

describe("orderable", () => {
  it("조각이 3~6개이고 같은 조각이 없을 때만 낸다", () => {
    const c = (...xs: string[]) => xs.map((text) => ({ text }));
    expect(orderable(c("a", "b"))).toBe(false);
    expect(orderable(c("a", "b", "c"))).toBe(true);
    expect(orderable(c("a", "b", "a"))).toBe(false);
    expect(orderable(c("1", "2", "3", "4", "5", "6", "7"))).toBe(false);
  });
});

describe("orderShape / orderAccepted", () => {
  const bike = orderChunks("がっこうまでじてんしゃで行く。", BIKE);
  if (!bike) throw new Error("가짜 문장을 나누지 못함");
  const shape = orderShape(bike.chunks);

  it("술어 앞 조사 마디는 차례를 바꿔도 맞다고 받는다", () => {
    expect(orderAccepted(["がっこうまで", "じてんしゃで", "行く"], shape)).toBe(
      true,
    );
    expect(orderAccepted(["じてんしゃで", "がっこうまで", "行く"], shape)).toBe(
      true,
    );
  });
  it("술어가 끝에 오지 않으면 틀린다", () => {
    expect(orderAccepted(["行く", "がっこうまで", "じてんしゃで"], shape)).toBe(
      false,
    );
  });
  it("꾸미는 조각(の·あの)은 꾸밈받는 낱말 앞에 붙어 다녀야 한다", () => {
    const r = orderChunks("あのねこはやまのねこ。", [
      { surface: "あの", pos: "連体詞" },
      { surface: "ねこ", pos: "名詞" },
      { surface: "は", pos: "助詞" },
      { surface: "やま", pos: "名詞" },
      { surface: "の", pos: "助詞" },
      { surface: "ねこ", pos: "名詞" },
      { surface: "。", plain: true },
    ]);
    if (!r) throw new Error("나누지 못함");
    const s = orderShape(r.chunks);
    expect(s).toEqual({
      phrases: [["あの", "ねこは"]],
      fixed: ["やまの", "ねこ"],
    });
    expect(orderAccepted(["あの", "ねこは", "やまの", "ねこ"], s)).toBe(true);
    expect(orderAccepted(["ねこは", "あの", "やまの", "ねこ"], s)).toBe(false);
  });
});
