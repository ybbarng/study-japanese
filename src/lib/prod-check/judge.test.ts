import { describe, expect, it } from "vitest";
import {
  judgeAdminOnly,
  judgeMedia,
  judgePage,
  judgeTranscript,
  mapLimit,
} from "./judge";

describe("judgeMedia", () => {
  it("열린 출처에서 206과 audio/mpeg면 통과", () => {
    expect(
      judgeMedia({ status: 206, contentType: "audio/mpeg" }, { open: true }),
    ).toEqual({ ok: true });
  });

  it("열린 출처에서 404면 상태 코드를 까닭으로 남긴다", () => {
    expect(
      judgeMedia(
        { status: 404, contentType: "text/plain; charset=utf-8" },
        { open: true },
      ),
    ).toEqual({ ok: false, reason: "404" });
  });

  it("206이어도 HTML이 오면(로그인 화면으로 넘어간 꼴) 실패", () => {
    expect(
      judgeMedia(
        { status: 200, contentType: "text/html; charset=utf-8" },
        { open: true },
      ),
    ).toEqual({ ok: false, reason: "200이지만 형식이 text/html" });
  });

  it("PDF는 application/pdf여야 한다", () => {
    expect(
      judgeMedia(
        { status: 206, contentType: "application/pdf" },
        { open: true, pdf: true },
      ),
    ).toEqual({ ok: true });
    expect(
      judgeMedia(
        { status: 206, contentType: "audio/mpeg" },
        { open: true, pdf: true },
      ).ok,
    ).toBe(false);
  });

  it("닫힌 출처는 403이면 닫힘으로 세고, 206이면 실패", () => {
    expect(
      judgeMedia({ status: 403, contentType: null }, { open: false }),
    ).toEqual({ ok: true, closed: true });
    expect(
      judgeMedia({ status: 206, contentType: "audio/mpeg" }, { open: false }),
    ).toEqual({ ok: false, reason: "닫힌 출처인데 206" });
  });
});

describe("judgeAdminOnly", () => {
  it("방문자에게 403이면 통과, 206이면 실패", () => {
    expect(judgeAdminOnly({ status: 403, contentType: null })).toEqual({
      ok: true,
    });
    expect(judgeAdminOnly({ status: 206, contentType: "audio/mpeg" })).toEqual({
      ok: false,
      reason: "방문자에게 206(403이어야 함)",
    });
  });
});

describe("judgePage", () => {
  it("200 HTML만 통과하고 넘겨주기(307)는 실패", () => {
    expect(
      judgePage({ status: 200, contentType: "text/html; charset=utf-8" }),
    ).toEqual({ ok: true });
    expect(judgePage({ status: 307, contentType: null })).toEqual({
      ok: false,
      reason: "307",
    });
  });
});

describe("judgeTranscript", () => {
  const segment = { start: 0, end: 1, text: "가짜 자막", lang: "ko" };

  it("segments가 하나 이상이면 통과", () => {
    expect(
      judgeTranscript(200, { segments: [segment] }, { open: true }),
    ).toEqual({ ok: true });
  });

  it("segments가 비었거나 없으면 실패", () => {
    expect(judgeTranscript(200, { segments: [] }, { open: true })).toEqual({
      ok: false,
      reason: "segments가 비어 있음",
    });
    expect(judgeTranscript(200, null, { open: true })).toEqual({
      ok: false,
      reason: "segments 없음",
    });
  });

  it("404는 실패, 닫힌 출처의 403은 닫힘", () => {
    expect(judgeTranscript(404, null, { open: true })).toEqual({
      ok: false,
      reason: "404",
    });
    expect(judgeTranscript(403, null, { open: false })).toEqual({
      ok: true,
      closed: true,
    });
  });
});

describe("mapLimit", () => {
  it("동시에 limit개를 넘지 않고, 결과는 입력 차례대로", async () => {
    let running = 0;
    let peak = 0;
    const result = await mapLimit([5, 1, 4, 2, 3], 2, async (n) => {
      running++;
      peak = Math.max(peak, running);
      // 실제 시간 대신 마이크로태스크 몇 번으로 순서를 섞는다
      for (let i = 0; i < n; i++) await Promise.resolve();
      running--;
      return n * 10;
    });
    expect(result).toEqual([50, 10, 40, 20, 30]);
    expect(peak).toBe(2);
  });

  it("빈 목록이면 빈 결과", async () => {
    expect(await mapLimit([], 8, async (x) => x)).toEqual([]);
  });
});
