import { createHash } from "node:crypto";

// 가사 줄 글의 지문: sha256 앞 8자리(16진수). 분석 파일이 가사 글 없이 줄을 가리키는 데 쓴다.
// 글을 되살릴 수 없고, 글이 한 글자라도 바뀌면 달라진다. 서버(node)에서만 쓴다.

export const LINE_HASH_PATTERN = /^[0-9a-f]{8}$/;

export function lineHash(ja: string): string {
  return createHash("sha256").update(ja, "utf8").digest("hex").slice(0, 8);
}
