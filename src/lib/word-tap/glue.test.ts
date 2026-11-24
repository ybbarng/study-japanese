import { describe, expect, it } from "vitest";
import { glueGroups } from "./glue";

const t = (...surfaces: string[]) => surfaces.map((surface) => ({ surface }));

describe("glueGroups", () => {
  it("문장 끝 마침표와 쉼표는 바로 앞 낱말과 한 묶음이 된다", () => {
    expect(glueGroups(t("山", "は", "、", "山", "だ", "。"))).toEqual([
      [0],
      [1, 2],
      [3],
      [4, 5],
    ]);
  });

  it("닫는 따옴표와 물음표가 이어져도 모두 앞 낱말에 붙는다", () => {
    expect(glueGroups(t("「", "山", "？", "」"))).toEqual([[0], [1, 2, 3]]);
  });

  it("맨 앞의 부호는 붙일 앞 조각이 없으니 혼자 묶음이 된다", () => {
    expect(glueGroups(t("。", "山"))).toEqual([[0], [1]]);
  });
});
