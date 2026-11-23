import { describe, expect, it } from "vitest";
import { type KoStem, koNoun, koPredicate } from "./korean";

const EAT: KoStem = ["먹", "먹어"];
const SEE: KoStem = ["보", "봐"];
const MAKE: KoStem = ["만들", "만들어"];
const HEAR: KoStem = ["듣", "들어", "들으"];
const COLD: KoStem = ["춥", "추워"];
const LONG: KoStem = ["길", "길어"];

describe("koPredicate: 동사", () => {
  it("현재 보통체는 받침에 따라 ㄴ다·는다를 붙이고 ㄹ 받침은 ㄹ을 뗀다", () => {
    expect(koPredicate(SEE, "plain", "verb")).toBe("본다");
    expect(koPredicate(EAT, "plain", "verb")).toBe("먹는다");
    expect(koPredicate(MAKE, "plain", "verb")).toBe("만든다");
  });

  it("정중체는 ㅂ니다·습니다, 과거는 아/어 꼴에 ㅆ을 단다", () => {
    expect(koPredicate(SEE, "polite", "verb")).toBe("봅니다");
    expect(koPredicate(MAKE, "polite", "verb")).toBe("만듭니다");
    expect(koPredicate(EAT, "polite", "verb")).toBe("먹습니다");
    expect(koPredicate(SEE, "past", "verb")).toBe("봤다");
    expect(koPredicate(EAT, "pastPolite", "verb")).toBe("먹었습니다");
  });

  it("으가 붙는 꼴은 받침을 보고, 바뀌는 줄기(들으)가 있으면 그것을 쓴다", () => {
    expect(koPredicate(EAT, "myeon", "verb")).toBe("먹으면");
    expect(koPredicate(SEE, "myeon", "verb")).toBe("보면");
    expect(koPredicate(MAKE, "myeon", "verb")).toBe("만들면");
    expect(koPredicate(HEAR, "myeon", "verb")).toBe("들으면");
    expect(koPredicate(SEE, "lsu", "verb")).toBe("볼 수");
    expect(koPredicate(EAT, "lsu", "verb")).toBe("먹을 수");
    expect(koPredicate(MAKE, "lsu", "verb")).toBe("만들 수");
    expect(koPredicate(HEAR, "lsu", "verb")).toBe("들을 수");
  });

  it("관형형 는은 ㄹ 받침을 떼고 붙인다", () => {
    expect(koPredicate(MAKE, "neun", "verb")).toBe("만드는");
    expect(koPredicate(EAT, "neun", "verb")).toBe("먹는");
  });

  it("부정·명령·청유·금지 꼴", () => {
    expect(koPredicate(EAT, "neg", "verb")).toBe("먹지 않는다");
    expect(koPredicate(EAT, "pastNegPolite", "verb")).toBe("먹지 않았습니다");
    expect(koPredicate(EAT, "imp", "verb")).toBe("먹어라");
    expect(koPredicate(SEE, "ja", "verb")).toBe("보자");
    expect(koPredicate(SEE, "jima", "verb")).toBe("보지 마");
  });
});

describe("koPredicate: 형용사", () => {
  it("현재 보통체는 다만 붙이고 부정은 않다", () => {
    expect(koPredicate(COLD, "plain", "adj")).toBe("춥다");
    expect(koPredicate(COLD, "neg", "adj")).toBe("춥지 않다");
  });

  it("ㄹ 받침 형용사의 정중체와 ~어지다", () => {
    expect(koPredicate(LONG, "polite", "adj")).toBe("깁니다");
    expect(koPredicate(COLD, "jil", "adj")).toBe("추워질");
    expect(koPredicate(COLD, "past", "adj")).toBe("추웠다");
  });
});

describe("koNoun", () => {
  it("받침이 없으면 이를 줄이고 가를 쓴다", () => {
    expect(koNoun("의사", "plain")).toBe("의사다");
    expect(koNoun("학생", "plain")).toBe("학생이다");
    expect(koNoun("의사", "past")).toBe("의사였다");
    expect(koNoun("학생", "pastPolite")).toBe("학생이었습니다");
    expect(koNoun("의사", "negPolite")).toBe("의사가 아닙니다");
    expect(koNoun("학생", "naru")).toBe("학생이 된다");
  });
});
