import { describe, expect, it } from "vitest";
import { speakerReading } from "./speaker";

describe("speakerReading", () => {
  it("대사 안에서 부른 이름 조각의 읽는 법을 이름표에 빌려 온다", () => {
    const tokens = [
      { surface: "山田", reading: "やまだ" },
      { surface: "さん" },
      { surface: "、" },
    ];
    expect(speakerReading("山田", [null, tokens])).toBe("やまだ");
  });

  it("성과 이름이 두 조각으로 나뉘어 있으면 이어 붙여 읽는다", () => {
    const tokens = [
      { surface: "田中", reading: "たなか" },
      { surface: "花子", reading: "はなこ" },
      { surface: "です" },
    ];
    expect(speakerReading("田中花子", [tokens])).toBe("たなかはなこ");
  });

  it("가나 이름이거나 대사에 그 이름이 없으면 읽는 법을 달지 않는다", () => {
    expect(speakerReading("ミナ", [[{ surface: "ミナ" }]])).toBeNull();
    expect(
      speakerReading("山田", [[{ surface: "山", reading: "やま" }]]),
    ).toBeNull();
  });
});
