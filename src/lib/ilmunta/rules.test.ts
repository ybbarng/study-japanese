import { describe, expect, it } from "vitest";
import type { Verb, VerbGroup } from "./conjugate";
import { ruleFor } from "./rules";

const v = (dict: string, reading: string, group: VerbGroup): Verb => ({
  dict,
  reading,
  group,
  ko: "",
});

describe("ruleFor: て형 규칙은 끝 글자 묶음을 말해 준다", () => {
  it("む로 끝나는 1그룹은 んで", () => {
    expect(ruleFor(v("飲む", "のむ", "godan"), "te")).toBe(
      "む·ぶ·ぬ로 끝나는 1그룹 → む를 빼고 んで",
    );
  });

  it("行く는 예외라고 알려 준다", () => {
    expect(ruleFor(v("行く", "いく", "godan"), "te")).toBe(
      "行く는 예외: く로 끝나도 って",
    );
  });

  it("たら형은 た형 + ら라고 덧붙인다", () => {
    expect(ruleFor(v("書く", "かく", "godan"), "tara")).toBe(
      "く로 끝나는 1그룹 → く를 빼고 いたら(た형 + ら)",
    );
  });
});

describe("ruleFor: 갈래별 규칙", () => {
  it("2그룹처럼 생긴 1그룹이면 먼저 그 사실을 말한다", () => {
    expect(ruleFor(v("帰る", "かえる", "godan"), "nai")).toBe(
      "帰る는 2그룹처럼 생겼지만 1그룹이다. 1그룹 → 끝 글자를 あ단으로 바꾸고 ない",
    );
  });

  it("う로 끝나는 1그룹의 ない형은 わ를 짚는다", () => {
    expect(ruleFor(v("買う", "かう", "godan"), "nai")).toBe(
      "う로 끝나는 1그룹 → う를 わ로 바꾸고 ない",
    );
  });

  it("くる의 ない형은 こ로 바뀐다고 말한다", () => {
    expect(ruleFor(v("来る", "くる", "kuru"), "nai")).toBe(
      "くる → こない(こ로 바뀐다)",
    );
  });

  it("する의 가능형은 できる", () => {
    expect(ruleFor(v("する", "する", "suru"), "potential")).toBe(
      "する의 가능형은 できる",
    );
  });
});
