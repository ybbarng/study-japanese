import type { WordPictureMap } from "../types";

// 일무따 1~15강 낱말 그림. 낱말(기본형) → public/pictures/words/<id>.svg
// 다른 범위 표에 이미 있는 낱말은 넣지 않는다(index.ts 시험이 본다).

export const WORDS: WordPictureMap = {
  傘: "umbrella",
  歌手: "singer",
};
