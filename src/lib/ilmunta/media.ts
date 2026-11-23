/** 교재 자료 폴더 기준 경로를 로그인 뒤 열리는 `/media/ilmunta/…` 주소로 */
export function ilmuntaMediaUrl(file: string): string {
  return `/media/ilmunta/${file.split("/").map(encodeURIComponent).join("/")}`;
}

/** 함께 보는 PDF(글은 옮기지 않고 링크만 둔다) */
export const ILMUNTA_PDFS = [
  { file: "3__핵심정리_소책자.pdf", label: "핵심정리 소책자" },
  { file: "1_동사_활용_쓰기표_정리표.pdf", label: "동사 활용 쓰기표·정리표" },
] as const;
