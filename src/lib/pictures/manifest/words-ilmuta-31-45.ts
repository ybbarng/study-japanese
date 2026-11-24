import type { WordPictureMap } from "../types";

// 일무따 31~45강에서 처음 나오는 낱말 그림. 낱말(기본형) → public/pictures/words/<id>.svg
// 다른 범위 표에 이미 있는 낱말은 넣지 않는다(index.ts 시험이 본다).

export const WORDS: WordPictureMap = {
  // 31강
  寝る: "sleep",
  降りる: "get-off",
  出かける: "go-out",
  電話: "telephone",
  // 32강
  電車: "train",
  タクシー: "taxi",
  子供: "child",
  朝: "morning",
  目: "eye",
  赤い: "color-red",
  // 33강
  鉛筆: "pencil",
  消しゴム: "eraser",
  兄: "older-brother",
  お兄さん: "older-brother",
  カフェ: "cafe",
  一番: "first-place",
  // 34강
  病院: "hospital",
  百貨店: "department-store",
  姉: "older-sister",
  お姉さん: "older-sister",
  先月: "last-month",
  // 35강
  はく: "put-on-pants",
  着く: "arrive",
  脱ぐ: "take-off-clothes",
  ズボン: "pants",
  パンツ: "pants",
  スカート: "skirt",
  空港: "airport",
  上着: "jacket",
  映画館: "movie-theater",
  プール: "pool",
  飛行機: "airplane",
};
