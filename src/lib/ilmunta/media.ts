/** 교재 자료 폴더 기준 경로를 로그인 뒤 열리는 `/media/ilmunta/…` 주소로 */
export function ilmuntaMediaUrl(file: string): string {
  return `/media/ilmunta/${file.split("/").map(encodeURIComponent).join("/")}`;
}

/** 함께 보는 PDF(글은 옮기지 않고 링크만 둔다). `perLesson`이면 그 과가 시작하는 쪽으로 연다 */
export const ILMUNTA_PDFS = [
  {
    file: "3__핵심정리_소책자.pdf",
    label: "핵심정리 소책자",
    perLesson: true,
  },
  {
    file: "1_동사_활용_쓰기표_정리표.pdf",
    label: "동사 활용 쓰기표·정리표",
    perLesson: false,
  },
] as const;

export interface PdfLink {
  href: string;
  label: string;
  /** 링크 옆 작은 글(`3쪽부터`) */
  note: string;
}

/** 과 화면의 PDF 링크. 소책자는 그 과의 쪽(`#page=`)으로 바로 연다 */
export function ilmuntaPdfLinks(lesson: {
  no: number;
  bookletPage?: number;
}): PdfLink[] {
  return ILMUNTA_PDFS.map((p) => {
    const page = p.perLesson ? lesson.bookletPage : undefined;
    return {
      href: `${ilmuntaMediaUrl(p.file)}${page ? `#page=${page}` : ""}`,
      label: page ? `${p.label} · ${lesson.no}과` : p.label,
      note: page ? `PDF ${page}쪽 ↗` : "PDF ↗",
    };
  });
}
