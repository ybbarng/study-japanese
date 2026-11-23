import { BRIDGE_BY_ID } from "@/lib/bridge/bridges";
import { lessonLabel } from "@/lib/ilmuta/labels";
import { LESSON_BY_ID } from "@/lib/kana/lessons";
import type { TodayAction } from "@/lib/today/pick";
import type { HomeData } from "@/lib/today/server-data";

export interface ActionText {
  /** 위 작은 줄: 무엇을 하는지 */
  eyebrow: string;
  title: string;
  /** 일본어 제목(있으면 크게) */
  ja?: string;
  sub?: string;
}

/** 오늘 할 것의 화면 글 */
export function actionText(a: TodayAction, data: HomeData): ActionText {
  const ilmutaTitle = (no: number) =>
    data.ilmuta?.titles.find((t) => t.no === no);
  switch (a.kind) {
    case "ilmuta-listen": {
      const t = ilmutaTitle(a.no);
      return {
        eyebrow: "일무따 · 강의 듣기",
        title: a.no === 0 ? "0강 · 오리엔테이션" : lessonLabel(a.no),
        ja: t?.title || undefined,
        sub: t?.titleKo ?? "걸으며 듣고 따라 말하기",
      };
    }
    case "ilmuta-write": {
      const t = ilmutaTitle(a.no);
      return {
        eyebrow: "일무따 · 문장 3개 쓰기",
        title: lessonLabel(a.no),
        ja: t?.title || undefined,
        sub: "앉아서 이 강 문형으로 내 문장을 써 봅니다",
      };
    }
    case "kana-lesson": {
      const lesson = LESSON_BY_ID.get(a.lessonId);
      return {
        eyebrow: a.first ? "가나 · 첫 레슨" : "가나 · 다음 레슨",
        title: lesson?.title ?? a.lessonId,
        ja: lesson?.glyphs,
        sub: "소리 → 알아보기 → 쓰기 → 낱말 읽기",
      };
    }
    case "kana-bridge": {
      const bridge = BRIDGE_BY_ID.get(a.bridgeId);
      return {
        eyebrow: "가나 · 바로 읽기",
        title: bridge?.title ?? "첫 읽기",
        ja: bridge?.glyphs,
        sub: "배운 글자만으로 교재 문장을 읽어 봅니다",
      };
    }
    case "kana-review":
      return {
        eyebrow: "가나 · 복습",
        title: `${a.due}글자가 기다려요`,
        sub: "잊을 때가 된 글자부터",
      };
    case "ilmunta": {
      const t = data.ilmunta?.titles.find((x) => x.no === a.no);
      return {
        eyebrow: "일문따 · 이어 듣기",
        title: `${a.no}과`,
        sub: t?.title,
      };
    }
    case "ilmunta-drill":
      return {
        eyebrow: "일문따 · 활용 드릴",
        title: "동사·형용사 활용 손 풀기",
      };
  }
}
