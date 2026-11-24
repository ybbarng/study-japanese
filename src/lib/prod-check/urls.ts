import { ilmuntaMediaUrl } from "@/lib/ilmunta/media";
import { ilmutaMediaUrl } from "@/lib/ilmuta/media";

// 운영 점검(scripts/check-prod.ts)이 부를 주소. 화면이 쓰는 주소 함수를 그대로 써서
// 사람이 누를 때와 같은 주소를 확인한다.

export type Book = "ilmuta" | "ilmunta";

/** 교재 자료 폴더 기준 경로(`1. 음성 강의/L01.mp3`)를 화면과 같은 `/media/<book>/…` 주소로 */
export function bookMediaUrl(book: Book, file: string): string {
  return book === "ilmuta" ? ilmutaMediaUrl(file) : ilmuntaMediaUrl(file);
}

/** 파일 경로의 마지막 조각에서 확장자를 뺀 것. 자막·기록의 항목 이름(L01, 01-4-1, L01-01)이다 */
export function itemOfFile(file: string): string {
  const base = file.split("/").at(-1) ?? file;
  return base.replace(/\.[^.]+$/, "");
}

export function transcriptUrl(book: Book, item: string): string {
  return `/api/transcripts/${book}/${encodeURIComponent(item)}`;
}

/** 출력용: 주소의 퍼센트 인코딩을 풀어 파일 이름이 읽히게 한다. 못 풀면 그대로 */
export function readablePath(url: string): string {
  try {
    return decodeURI(url);
  } catch {
    return url;
  }
}

/** 주소가 ASCII 밖 글자(한글 등)를 담고 있는지. 인코딩 전 경로로 판단한다 */
export function hasNonAscii(path: string): boolean {
  // biome-ignore lint/suspicious/noControlCharactersInRegex: ASCII 범위를 그대로 적는다
  return /[^\x00-\x7f]/.test(path);
}

/** `https://a.b/` + `/x` → `https://a.b/x` */
export function joinUrl(base: string, path: string): string {
  return `${base.replace(/\/+$/, "")}${path.startsWith("/") ? "" : "/"}${path}`;
}
