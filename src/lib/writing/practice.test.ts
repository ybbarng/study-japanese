import { describe, expect, it } from "vitest";
import { HIRAGANA_SET } from "./kana-sets";
import { nextPosition, positionOf, strokeFeedback } from "./practice";

describe("써 보기 획마다 알림", () => {
  it("맞으면 몇 획째인지, 마지막 획이면 다 썼다고 한다", () => {
    expect(strokeFeedback({ kind: "ok" }, 0, 3)).toEqual({
      ok: true,
      text: "좋아요 · 1/3획",
    });
    expect(strokeFeedback({ kind: "ok" }, 2, 3).text).toBe("다 썼어요!");
  });

  it("순서가 틀리면 그은 획과 써야 할 획 번호를 함께 알려 준다", () => {
    expect(strokeFeedback({ kind: "order", matches: 2 }, 0, 3)).toEqual({
      ok: false,
      text: "그건 3번째 획이에요. 지금은 1번째 획을 써요.",
    });
  });
});

describe("히라가나 묶음에서 다음 글자", () => {
  it("あ행 안에서는 옆 글자로 간다", () => {
    const at = positionOf(HIRAGANA_SET, "あ");
    const next = nextPosition(HIRAGANA_SET, at);
    const row = HIRAGANA_SET.rows.find((r) => r.id === next.rowId);
    expect(row?.items[next.index].text).toBe("い");
  });

  it("행 끝(お) 다음은 か행 첫 글자다", () => {
    const next = nextPosition(HIRAGANA_SET, positionOf(HIRAGANA_SET, "お"));
    const row = HIRAGANA_SET.rows.find((r) => r.id === next.rowId);
    expect([row?.label, row?.items[next.index].text]).toEqual(["か행", "か"]);
  });

  it("わ행은 わ·を·ん을 한 줄로 이어 쓴다", () => {
    const row = HIRAGANA_SET.rows.find((r) => r.label === "わ행");
    expect(row?.items.map((i) => i.text)).toEqual(["わ", "を", "ん"]);
  });
});
