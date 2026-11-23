// 형태소 분석기 사전 파일(/kuromoji-dict/*.dat.gz)의 바이트를 푼다.
// 파일은 gzip으로 묶여 있다. 서버나 앞단 프록시가 Content-Encoding: gzip을 붙이면 브라우저가
// 먼저 풀어 주므로, 그때 한 번 더 풀면 깨진다. 그래서 앞 두 바이트(gzip 표시)를 보고 묶여 있을 때만 푼다.

/** kuromoji DictionaryLoader가 받는 사전 파일 수 */
export const DICT_FILE_COUNT = 12;

export function isGzip(bytes: Uint8Array): boolean {
  return bytes.length >= 2 && bytes[0] === 0x1f && bytes[1] === 0x8b;
}

/** gzip이면 풀고, 이미 풀린 바이트면 그대로 돌려준다 */
export async function gunzipIfNeeded(bytes: Uint8Array): Promise<ArrayBuffer> {
  if (!isGzip(bytes)) return copyBuffer(bytes);
  const stream = new Blob([copyBuffer(bytes)])
    .stream()
    .pipeThrough(new DecompressionStream("gzip"));
  return new Response(stream).arrayBuffer();
}

/** 분석기가 Int32Array 등으로 읽으므로 딱 그 바이트만 담은 버퍼로 */
function copyBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.slice().buffer as ArrayBuffer;
}
