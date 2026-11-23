import { describe, expect, it } from "vitest";
import { activeNav, progressLine, showsNav } from "./nav";

describe("activeNav", () => {
  it("첫 화면은 오늘 자리다", () => {
    expect(activeNav("/")).toBe("today");
  });

  it("강 화면은 그 책 자리다", () => {
    expect(activeNav("/ilmuta/12")).toBe("ilmuta");
    expect(activeNav("/ilmunta/drill")).toBe("ilmunta");
    expect(activeNav("/kana/lesson/h-a")).toBe("kana");
  });

  it("노래 목록·가사·박자 맞추기 화면은 노래 자리다", () => {
    expect(activeNav("/songs")).toBe("songs");
    expect(activeNav("/songs/test-song")).toBe("songs");
    expect(activeNav("/songs/test-song/sync")).toBe("songs");
  });

  it("이름 앞부분만 같은 주소를 다른 책으로 잘못 잡지 않는다", () => {
    // /ilmunta는 /ilmuta로 시작하지 않지만, 앞부분 비교만 하면 헷갈리기 쉬운 짝이다
    expect(activeNav("/ilmunta")).toBe("ilmunta");
    expect(activeNav("/ilmuta")).toBe("ilmuta");
  });

  it("탐색에 없는 주소는 어느 자리도 아니다", () => {
    expect(activeNav("/lab/player")).toBeNull();
  });
});

describe("showsNav", () => {
  it("로그인 화면에서만 탐색을 감춘다", () => {
    expect(showsNav("/login")).toBe(false);
    expect(showsNav("/ilmuta/3")).toBe(true);
  });
});

describe("progressLine", () => {
  const p = {
    kana: { learned: 12, total: 142 },
    ilmuta: { done: 3, total: 60 },
    ilmunta: { done: 0, total: 56 },
  };

  it("책마다 단위를 붙여 진도를 한 줄로 쓴다", () => {
    expect(progressLine("kana", p)).toBe("글자 12/142");
    expect(progressLine("ilmuta", p)).toBe("강의 3/60");
    expect(progressLine("ilmunta", p)).toBe("0/56과");
  });

  it("진도를 모르는 자리는 비운다", () => {
    expect(progressLine("today", p)).toBeNull();
    expect(progressLine("ilmuta", {})).toBeNull();
  });
});
