import { describe, expect, it } from "vitest";
import { ilmuntaPdfLinks } from "./media";

describe("과 화면의 PDF 링크", () => {
  it("소책자는 그 과가 시작하는 쪽으로 열고, 활용표는 처음부터 연다", () => {
    const [booklet, table] = ilmuntaPdfLinks({ no: 7, bookletPage: 5 });
    expect(booklet.href).toBe(
      `/media/ilmunta/${encodeURIComponent("3__핵심정리_소책자.pdf")}#page=5`,
    );
    expect(booklet.label).toBe("핵심정리 소책자 · 7과");
    expect(booklet.note).toBe("PDF 5쪽 ↗");
    expect(table.href).not.toContain("#page=");
  });

  it("쪽을 모르면 소책자도 처음부터 연다", () => {
    const [booklet] = ilmuntaPdfLinks({ no: 7 });
    expect(booklet.href).toBe(
      `/media/ilmunta/${encodeURIComponent("3__핵심정리_소책자.pdf")}`,
    );
    expect(booklet.label).toBe("핵심정리 소책자");
  });
});
