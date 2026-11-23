import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { openDb } from "@/lib/store/db";
import type { MediaLimits } from "./quota";
import { serveMedia } from "./serve";

// 실제 파일과 실제 SQLite(메모리)로 내주기·상한을 확인한다.
const NOW = Date.UTC(2027, 0, 5, 0, 0); // 2027-01-05 09:00 KST
const FILE_BYTES = 1000;
const LIMITS: MediaLimits = { perSessionBytes: 2500, globalBytes: 4000 };

function setup() {
  const mediaDir = mkdtempSync(path.join(tmpdir(), "sj-media-"));
  mkdirSync(path.join(mediaDir, "ilmuta"));
  writeFileSync(
    path.join(mediaDir, "ilmuta", "01-1.mp3"),
    Buffer.alloc(FILE_BYTES, 1),
  );
  const db = openDb(":memory:");
  const get = (session: string, opts: { range?: string; now?: number } = {}) =>
    serveMedia(
      new Request("http://localhost/media/ilmuta/01-1.mp3", {
        headers: opts.range ? { range: opts.range } : {},
      }),
      ["ilmuta", "01-1.mp3"],
      {
        mediaDir,
        db,
        sessionToken: session,
        now: opts.now ?? NOW,
        limits: LIMITS,
      },
    );
  return { get };
}

describe("교재 오디오 내주기", () => {
  it("오래 들고 있도록 private·immutable 캐시 헤더와 Range를 준다", async () => {
    const { get } = setup();
    const res = await get("phone", { range: "bytes=0-99" });
    expect(res.status).toBe(206);
    expect(res.headers.get("cache-control")).toBe(
      "private, max-age=2592000, immutable",
    );
    expect(res.headers.get("content-range")).toBe("bytes 0-99/1000");
  });
});

describe("하루 전송량 상한", () => {
  it("한 세션이 하루 상한을 넘기려 하면 429와 다음 한국 자정까지의 Retry-After", async () => {
    const { get } = setup();
    expect((await get("phone")).status).toBe(200);
    expect((await get("phone")).status).toBe(200);
    const blocked = await get("phone"); // 3000 > 2500
    expect(blocked.status).toBe(429);
    expect(blocked.headers.get("retry-after")).toBe(String(15 * 3600));
  });

  it("같은 파일을 짧은 간격으로 되풀이해 받아도 보낸 양이 쌓여 막힌다", async () => {
    const { get } = setup();
    const statuses = [];
    for (let i = 0; i < 6; i++)
      statuses.push((await get("phone", { range: "bytes=0-499" })).status);
    expect(statuses).toEqual([206, 206, 206, 206, 206, 429]);
  });

  it("세션이 여러 개여도 모든 세션 합계 상한에서 막힌다", async () => {
    const { get } = setup();
    expect((await get("a")).status).toBe(200);
    expect((await get("a")).status).toBe(200);
    expect((await get("b")).status).toBe(200);
    expect((await get("b")).status).toBe(200);
    expect((await get("c")).status).toBe(429); // 합계 5000 > 4000
  });

  it("다음 날(한국 시각)이 되면 다시 받을 수 있다", async () => {
    const { get } = setup();
    await get("phone");
    await get("phone");
    expect((await get("phone")).status).toBe(429);
    const nextDayKst = Date.UTC(2027, 0, 5, 15, 0); // 2027-01-06 00:00 KST
    expect((await get("phone", { now: nextDayKst })).status).toBe(200);
  });
});
