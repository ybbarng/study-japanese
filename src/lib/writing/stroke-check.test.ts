import { describe, expect, it } from "vitest";
import { issueText, judgeStroke, judgeStrokes } from "./stroke-check";
import type { Pt } from "./types";

const SIZE = 100;

/** 두 점 사이 직선을 점 몇 개로(가짜 획) */
function line(x1: number, y1: number, x2: number, y2: number, n = 8): Pt[] {
  return Array.from({ length: n }, (_, i) => ({
    x: x1 + ((x2 - x1) * i) / (n - 1),
    y: y1 + ((y2 - y1) * i) / (n - 1),
  }));
}

/** 손 떨림처럼 점마다 조금씩 비튼다(결과가 언제나 같게 정해진 무늬로) */
const wobble = (s: Pt[], amount = 3): Pt[] =>
  s.map((p, i) => ({
    x: p.x + (i % 2 ? amount : -amount),
    y: p.y + (i % 3 ? -amount : amount),
  }));

// 가짜 3획 글자(干 모양): 가로 위, 가로 아래, 세로
const GLYPH = [
  line(20, 30, 80, 30),
  line(10, 55, 90, 55),
  line(50, 30, 50, 90),
];

describe("획 하나 견주기", () => {
  it("본보기 획을 조금 떨며 따라 그어도 맞다", () => {
    const v = judgeStroke(wobble(line(22, 32, 78, 29)), GLYPH, 0, SIZE);
    expect(v).toEqual({ kind: "ok" });
  });

  it("같은 자리를 끝에서 시작으로 그으면 방향이 거꾸로다", () => {
    expect(judgeStroke(line(80, 30, 20, 30), GLYPH, 0, SIZE)).toEqual({
      kind: "reversed",
    });
  });

  it("다른 차례의 획을 먼저 그으면 순서가 틀리고 그 획 번호를 준다", () => {
    expect(judgeStroke(line(50, 30, 50, 90), GLYPH, 0, SIZE)).toEqual({
      kind: "order",
      matches: 2,
    });
  });

  it("어느 본보기 획과도 먼 선은 자리가 다르다", () => {
    expect(judgeStroke(line(5, 95, 30, 70), GLYPH, 0, SIZE)).toEqual({
      kind: "off",
    });
  });

  it("짧은 점 획은 방향을 따지지 않는다", () => {
    const dots = [line(20, 50, 80, 50), line(85, 10, 88, 14)];
    expect(judgeStroke(line(88, 14, 85, 10), dots, 1, SIZE)).toEqual({
      kind: "ok",
    });
  });
});

describe("다 쓴 글자의 획순·방향", () => {
  it("본보기 차례와 방향대로 쓰면 틀린 획이 없다", () => {
    const drawn = GLYPH.map((s) => wobble(s));
    expect(judgeStrokes(drawn, GLYPH, SIZE)).toEqual([]);
  });

  it("자리와 크기가 달라도(칸 구석에 작게) 차례·방향이 맞으면 통과한다", () => {
    const small = GLYPH.map((s) =>
      s.map((p) => ({ x: 10 + p.x * 0.5, y: 5 + p.y * 0.5 })),
    );
    expect(judgeStrokes(small, GLYPH, SIZE)).toEqual([]);
  });

  it("세로획을 거꾸로(아래에서 위로) 그으면 그 획만 알려 준다", () => {
    const drawn = [GLYPH[0], GLYPH[1], line(50, 90, 50, 30)];
    const issues = judgeStrokes(drawn, GLYPH, SIZE);
    expect(issues).toEqual([{ index: 2, verdict: { kind: "reversed" } }]);
    expect(issueText(issues[0])).toBe(
      "3번째 획의 방향이 거꾸로예요. 본보기의 시작점에서 그어요.",
    );
  });

  it("가로획 둘의 차례를 바꾸면 순서가 틀린 획을 알려 준다", () => {
    const drawn = [GLYPH[1], GLYPH[0], GLYPH[2]];
    expect(judgeStrokes(drawn, GLYPH, SIZE).map((i) => i.verdict)).toEqual([
      { kind: "order", matches: 1 },
      { kind: "order", matches: 0 },
    ]);
  });

  it("획 수가 다르면(다른 꼴) 획끼리 견주지 않는다", () => {
    expect(judgeStrokes([GLYPH[0], GLYPH[1]], GLYPH, SIZE)).toEqual([]);
  });
});
