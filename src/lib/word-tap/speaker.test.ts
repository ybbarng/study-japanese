import { describe, expect, it } from "vitest";
import { speakerRuby } from "./speaker";

describe("speakerRuby", () => {
  it("대사 안에서 부른 이름 조각의 읽는 법을 이름표에 빌려 온다", () => {
    const tokens = [
      { surface: "山田", reading: "やまだ" },
      { surface: "さん" },
      { surface: "、" },
    ];
    expect(speakerRuby("山田", [null, tokens])).toEqual([
      { text: "山田", reading: "やまだ" },
    ]);
  });

  it("띄어 쓴 이름표는 대사에서 부른 마디(이름)에만 읽는 법을 단다", () => {
    const tokens = [{ surface: "花子", reading: "はなこ" }, { surface: "は" }];
    expect(speakerRuby("田中 花子", [tokens])).toEqual([
      { text: "田中" },
      { text: " " },
      { text: "花子", reading: "はなこ" },
    ]);
  });

  it("두 조각으로 나뉜 이름은 이어 붙여 읽는다", () => {
    const tokens = [
      { surface: "田中", reading: "たなか" },
      { surface: "花子", reading: "はなこ" },
    ];
    expect(speakerRuby("田中花子", [tokens])).toEqual([
      { text: "田中花子", reading: "たなかはなこ" },
    ]);
  });

  it("가나 이름이거나 대사에 그 이름이 없으면 읽는 법을 달지 않는다", () => {
    expect(speakerRuby("ミナ", [[{ surface: "ミナ" }]])).toEqual([
      { text: "ミナ" },
    ]);
    expect(speakerRuby("山田", [[{ surface: "山", reading: "やま" }]])).toEqual(
      [{ text: "山田" }],
    );
  });
});
