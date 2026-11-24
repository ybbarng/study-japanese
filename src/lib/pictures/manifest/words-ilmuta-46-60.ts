import type { WordPictureMap } from "../types";

// 일무따 46~60강에서 처음 나오는 낱말 그림. 낱말(기본형) → public/pictures/words/<id>.svg
// 다른 범위 표에 이미 있는 낱말은 넣지 않는다(index.ts 시험이 본다).

export const WORDS: WordPictureMap = {
  // 46강
  困る: "troubled",
  ボールペン: "ballpoint-pen",
  牛乳: "milk",
  机: "desk",
  椅子: "chair",
  りんご: "apple",
  みかん: "mandarin",
  店員: "shop-clerk",
  お釣り: "change-money",
  // 47강
  スーパー: "supermarket",
  家: "house",
  花見: "cherry-blossom-viewing",
  焼肉: "yakiniku",
  肉: "meat",
  // 48강
  座る: "sit",
  二人: "two-people",
  ヘアスタイル: "hairstyle",
  スキー: "ski",
  花: "flower",
  // 49강
  後ろ: "behind",
  スタンド: "desk-lamp",
  リモコン: "remote-control",
  テーブル: "table",
  ソファー: "sofa",
  木: "tree",
  夢: "dream",
  高校: "high-school",
  ファッションデザイナー: "fashion-designer",
  ファッションデザイン: "fashion-designer",
  // 50강
  隣: "next-to",
  横: "next-to",
  間: "between",
  祖母: "grandmother",
  箱: "box",
  本棚: "bookshelf",
  鏡: "mirror",
  トイレ: "toilet",
  兄弟: "brothers",
  寂しい: "lonely",
  動物: "animals",
};
