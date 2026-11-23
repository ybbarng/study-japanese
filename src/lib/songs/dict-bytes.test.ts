import { gzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { gunzipIfNeeded, isGzip } from "./dict-bytes";

// 사전 파일은 gzip으로 묶여 온다. 앞단이 Content-Encoding: gzip을 붙이면 브라우저가 먼저 풀어 준다.
// 두 경우 모두 같은 바이트가 나와야 한다.
const original = new Uint8Array(Int32Array.from([1, -2, 3, 400000]).buffer);
const bytesOf = (buffer: ArrayBuffer) => [...new Uint8Array(buffer)];

describe("gunzipIfNeeded", () => {
  it("gzip으로 묶인 사전 파일을 푼다", async () => {
    const gz = new Uint8Array(gzipSync(original));
    expect(isGzip(gz)).toBe(true);
    expect(bytesOf(await gunzipIfNeeded(gz))).toEqual([...original]);
  });

  it("브라우저가 이미 풀어 준 바이트는 다시 풀지 않고 그대로 돌려준다", async () => {
    expect(isGzip(original)).toBe(false);
    expect(bytesOf(await gunzipIfNeeded(original))).toEqual([...original]);
  });

  it("더 큰 버퍼의 일부를 받아도 그 부분만 담은 버퍼를 돌려준다(Int32Array로 읽을 수 있게)", async () => {
    const big = new Uint8Array(32);
    big.set(original, 8);
    const view = big.subarray(8, 8 + original.length);
    const out = await gunzipIfNeeded(view);
    expect(Array.from(new Int32Array(out))).toEqual([1, -2, 3, 400000]);
  });
});
