import type { WordPictureMap } from "../types";

// 일무따 16~30강에서 처음 나오는 낱말 그림. 낱말(기본형) → public/pictures/words/<id>.svg
// 다른 범위 표에 이미 있는 낱말은 넣지 않는다(index.ts 시험이 본다).
// 뜻이 둘로 갈리는 낱말(薄い·うまい·聞く 등), 인사말, 문법어, 나라·도시 이름은 그리지 않는다.

export const WORDS: WordPictureMap = {
  // 16강
  熱い: "hot-drink",
  冷たい: "cold-drink",
  暑い: "hot-weather",
  寒い: "cold-weather",
  厚い: "thick",
  お茶: "green-tea",
  ジュース: "juice",
  ノートパソコン: "laptop",
  夏: "summer",
  冬: "winter",
  // 17강
  おいしい: "delicious",
  まずい: "bad-taste",
  新しい: "new",
  古い: "old",
  広い: "wide",
  狭い: "narrow",
  酒: "sake",
  建物: "building",
  部屋: "room",
  うち: "home",
  // 18강
  面白い: "funny",
  つまらない: "boring",
  楽しい: "fun",
  忙しい: "busy",
  難しい: "difficult",
  優しい: "kind",
  映画: "movie",
  ドラマ: "drama",
  今週: "this-week",
  先週: "last-week",
  先々週: "week-before-last",
  見ました: "see",
  // 19강
  食べる: "eat",
  見る: "see",
  開ける: "open",
  閉める: "close",
  着る: "wear",
  ご飯: "rice",
  テレビ: "tv",
  窓: "window",
  ドア: "door",
  スーツ: "suit",
  女優: "actress",
  // 20강
  食べます: "eat",
  見ます: "see",
  開けます: "open",
  閉めます: "close",
  着ます: "wear",
  果物: "fruit",
  門: "gate",
  カーテン: "curtain",
  制服: "school-uniform",
  明後日: "day-after-tomorrow",
};
