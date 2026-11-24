// PC 왼쪽 탐색: 어떤 자리가 있고, 지금 주소가 어느 자리인지, 자리마다 진도 한 줄.

export type NavId =
  | "today"
  | "kana"
  | "ilmuta"
  | "ilmunta"
  | "songs"
  | "words"
  | "ime"
  | "offline";

export interface NavItem {
  id: NavId;
  href: string;
  label: string;
  /** 일본어 머리글자(글자 연습 겸 표지) */
  ja?: string;
}

export const STUDY_ITEMS: NavItem[] = [
  { id: "today", href: "/", label: "오늘", ja: "今日" },
  { id: "kana", href: "/kana", label: "가나", ja: "あ" },
  { id: "ilmuta", href: "/ilmuta", label: "일무따", ja: "話" },
  { id: "ilmunta", href: "/ilmunta", label: "일문따", ja: "文" },
  { id: "songs", href: "/songs", label: "노래", ja: "歌" },
];

export const TOOL_ITEMS: NavItem[] = [
  { id: "words", href: "/words", label: "낱말 사전" },
  { id: "ime", href: "/ime", label: "입력기 켜기" },
  { id: "offline", href: "/offline", label: "받아 둔 강" },
];

/** 지금 주소가 속한 자리. 어디에도 속하지 않으면 null */
export function activeNav(pathname: string): NavId | null {
  if (pathname === "/") return "today";
  for (const item of [...STUDY_ITEMS, ...TOOL_ITEMS]) {
    if (item.href === "/") continue;
    if (pathname === item.href || pathname.startsWith(`${item.href}/`))
      return item.id;
  }
  return null;
}

/** 탐색을 그리지 않는 화면(로그인 화면은 화면 전체를 쓴다) */
export function showsNav(pathname: string): boolean {
  return pathname !== "/login";
}

export interface NavProgress {
  kana?: { learned: number; total: number };
  ilmuta?: { done: number; total: number };
  ilmunta?: { done: number; total: number };
}

/** 자리 옆에 붙일 진도 한 줄. 모르면 null */
export function progressLine(id: NavId, p: NavProgress): string | null {
  if (id === "kana" && p.kana) return `글자 ${p.kana.learned}/${p.kana.total}`;
  if (id === "ilmuta" && p.ilmuta)
    return `강의 ${p.ilmuta.done}/${p.ilmuta.total}`;
  if (id === "ilmunta" && p.ilmunta)
    return `${p.ilmunta.done}/${p.ilmunta.total}과`;
  return null;
}
