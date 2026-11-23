import { describe, expect, it, vi } from "vitest";
import { annotateLines, keepStoredTokens } from "./annotate";
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

  it("줄에 붙어 있던 조각은 믿지 않고 저장된 조각이나 새 분석으로 바꾼다", async () => {
    const lines = await annotateLines(
      [{ ja: "あ", tokens: [{ surface: "い" }] }],
      [],
      async () => fakeTokenize,
    );
    expect(lines[0].tokens).toEqual([{ surface: "あ" }]);
  });
});

describe("keepStoredTokens(서버: 분석 없이 저장된 조각만 이어 붙인다)", () => {
  const stored = [{ ja: "あい", tokens: [{ surface: "あい", pos: "名詞" }] }];

  it("조각 없이 온 줄에 같은 글의 저장된 조각을 붙인다", () => {
    expect(keepStoredTokens([{ ja: "あい", start: 2 }], stored)).toEqual([
      { ja: "あい", start: 2, tokens: [{ surface: "あい", pos: "名詞" }] },
    ]);
  });

  it("브라우저가 보낸 조각은 저장된 것보다 앞선다", () => {
    const sent = [{ surface: "あ" }, { surface: "い" }];
    expect(keepStoredTokens([{ ja: "あい", tokens: sent }], stored)).toEqual([
      { ja: "あい", tokens: sent },
    ]);
  });

  it("저장된 같은 글이 없으면 조각 없이 둔다(화면은 글만 보인다)", () => {
    expect(keepStoredTokens([{ ja: "うえ" }], stored)).toEqual([
      { ja: "うえ" },
    ]);
  });
});
