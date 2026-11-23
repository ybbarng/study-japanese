import type { TodayAction } from "./pick";

/** 오늘 할 것을 누르면 갈 화면 */
export function actionHref(a: TodayAction): string {
  switch (a.kind) {
    case "ilmuta-listen":
      return `/ilmuta/${a.no}`;
    case "ilmuta-write":
      return `/ilmuta/${a.no}?step=writing`;
    case "kana-lesson":
      return `/kana/lesson/${a.lessonId}`;
    case "kana-bridge":
      return `/kana/read/${a.bridgeId}`;
    case "kana-review":
      return "/kana/review";
    case "ilmunta":
      return `/ilmunta/${a.no}`;
    case "ilmunta-drill":
      return "/ilmunta/drill";
  }
}
