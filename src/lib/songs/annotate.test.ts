import { describe, expect, it, vi } from "vitest";
import { annotateLines } from "./annotate";
import type { SongToken } from "./schema";

/** 분석기 대신: 글자 하나를 조각 하나로 */
const fakeTokenize = (text: string): SongToken[] =>
  [...text].map((surface) => ({ surface }));

describe("annotateLines", () => {
  it("새 글의 줄마다 조각을 붙인다", async () => {
    const lines = await annotateLines(
      [{ ja: "あい", start: 1 }],
      [],
      async () => fakeTokenize,
    );
    expect(lines).toEqual([
      { ja: "あい", start: 1, tokens: [{ surface: "あ" }, { surface: "い" }] },
    ]);
  });

  it("모든 줄이 저장된 글과 같으면 분석기를 띄우지 않고 저장된 조각을 다시 쓴다", async () => {
    const load = vi.fn(async () => fakeTokenize);
    const stored = [{ ja: "あい", tokens: [{ surface: "あい", pos: "名詞" }] }];
    const lines = await annotateLines(
      [{ ja: "あい", note: "새 메모" }],
      stored,
      load,
    );
    expect(load).not.toHaveBeenCalled();
    expect(lines).toEqual([
      {
        ja: "あい",
        note: "새 메모",
        tokens: [{ surface: "あい", pos: "名詞" }],
      },
    ]);
  });

  it("같은 글이 여러 번 나와도 한 번만 분석한다", async () => {
    const tokenize = vi.fn(fakeTokenize);
    await annotateLines([{ ja: "あ" }, { ja: "あ" }], [], async () => tokenize);
    expect(tokenize).toHaveBeenCalledTimes(1);
  });

  it("들어온 줄에 조각이 섞여 와도 서버가 만든 조각으로 바꾼다", async () => {
    const lines = await annotateLines(
      [{ ja: "あ", tokens: [{ surface: "가짜" }] } as never],
      [],
      async () => fakeTokenize,
    );
    expect(lines[0].tokens).toEqual([{ surface: "あ" }]);
  });
});
