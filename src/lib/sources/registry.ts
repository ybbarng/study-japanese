// 이 사이트에 모으는 남의 자료와 그 출처. 앞으로 여러 출처의 자료가 더해진다.
// 자료를 새로 들일 때 여기에 출처를 먼저 적고, 화면은 출처 표시(SourceCredit)를 붙인다.
// 공개 여부는 출처마다 설정(site-settings)에서 닫을 수 있다(기본 공개).

export interface Source {
  id: string;
  /** 화면에 보일 자료 이름 */
  title: string;
  /** 저작권자 */
  rightsHolder: string;
  /** 원래 자료를 받을 수 있는 곳 */
  url: string;
  /** 출처 표시 아래 붙일 저작권 문구 */
  notice: string;
  /** 이 출처 자료가 서버 media/ 아래 어느 폴더에 있는지 */
  mediaDirs: readonly string[];
  /** content/ 아래 어느 책 이름(transcripts/<book> 등)으로 들어 있는지 */
  books: readonly string[];
}

const GILBUT_NOTICE =
  "음성·글 자료의 저작권은 (주)도서출판 길벗에 있습니다. 출판사가 무료로 공개한 학습 자료를 학습용으로 모아 보여 주며, 권리자가 원하면 내립니다.";

export const SOURCES: readonly Source[] = [
  {
    id: "gilbut-ilmuta",
    title: "『일본어 무작정 따라하기』 학습 자료",
    rightsHolder: "(주)도서출판 길벗",
    url: "https://www.gilbut.co.kr",
    notice: GILBUT_NOTICE,
    mediaDirs: ["ilmuta", "kana"],
    books: ["ilmuta"],
  },
  {
    id: "gilbut-ilmunta",
    title: "『일본어 문법 무작정 따라하기』 학습 자료",
    rightsHolder: "(주)도서출판 길벗",
    url: "https://www.gilbut.co.kr",
    notice: GILBUT_NOTICE,
    mediaDirs: ["ilmunta"],
    books: ["ilmunta"],
  },
];

export function sourceById(id: string): Source | undefined {
  return SOURCES.find((s) => s.id === id);
}

/** media/ 아래 첫 폴더 이름으로 그 자료의 출처 */
export function sourceOfMedia(firstSegment: string): Source | undefined {
  return SOURCES.find((s) => s.mediaDirs.includes(firstSegment));
}

/** 책 이름(ilmuta·ilmunta)으로 그 자료의 출처 */
export function sourceOfBook(book: string): Source | undefined {
  return SOURCES.find((s) => s.books.includes(book));
}

export interface SiteSettings {
  /** 로그인하지 않은 사람에게 닫아 둔 출처 id(기본: 모두 공개) */
  closedSources: string[];
}

export const DEFAULT_SITE_SETTINGS: SiteSettings = { closedSources: [] };

/**
 * 이 사람이 이 출처 자료를 볼 수 있는지. 출처를 모르는 자료(목록에 없는 폴더)는
 * 관리자만 본다 — 출처를 적지 않고 새 자료를 넣었을 때 저절로 공개되지 않게.
 */
export function canSeeSource(
  source: Source | undefined,
  isAdmin: boolean,
  settings: SiteSettings,
): boolean {
  if (isAdmin) return true;
  if (!source) return false;
  return !settings.closedSources.includes(source.id);
}
