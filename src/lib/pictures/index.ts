import { emojiOf, lookupForms } from "@/lib/context/emoji";
import { SCENES as ILMUTA_01_15_SCENES } from "./manifest/scenes-ilmuta-01-15";
import { SCENES as ILMUTA_16_30_SCENES } from "./manifest/scenes-ilmuta-16-30";
import { SCENES as ILMUTA_31_45_SCENES } from "./manifest/scenes-ilmuta-31-45";
import { SCENES as ILMUTA_46_60_SCENES } from "./manifest/scenes-ilmuta-46-60";
import { WORDS as ILMUTA_01_15_WORDS } from "./manifest/words-ilmuta-01-15";
import { WORDS as ILMUTA_16_30_WORDS } from "./manifest/words-ilmuta-16-30";
import { WORDS as ILMUTA_31_45_WORDS } from "./manifest/words-ilmuta-31-45";
import { WORDS as ILMUTA_46_60_WORDS } from "./manifest/words-ilmuta-46-60";
import { scenePictureSrc, wordPictureSrc } from "./paths";
import {
  type Book,
  type ScenePart,
  type ScenePicture,
  type ScenePictureMap,
  sceneKey,
  type WordPictureMap,
} from "./types";

// 낱말·장면에 붙일 그림을 고른다. 그린 그림(SVG)이 있으면 그것, 없으면 그림 문자(emoji.ts).
// 표는 맡은 범위마다 manifest/ 아래 파일 하나씩 두고 여기에 한 줄씩 더한다(docs/pictures.md).

/** 범위 이름 → 낱말 그림 표. 같은 낱말이 두 표에 들어가지 않는다(시험이 본다) */
export const WORD_MANIFESTS: Readonly<Record<string, WordPictureMap>> = {
  "ilmuta-01-15": ILMUTA_01_15_WORDS,
  "ilmuta-16-30": ILMUTA_16_30_WORDS,
  "ilmuta-31-45": ILMUTA_31_45_WORDS,
  "ilmuta-46-60": ILMUTA_46_60_WORDS,
};

/** 범위 이름 → 장면 그림 표 */
export const SCENE_MANIFESTS: Readonly<Record<string, ScenePictureMap>> = {
  "ilmuta-01-15": ILMUTA_01_15_SCENES,
  "ilmuta-16-30": ILMUTA_16_30_SCENES,
  "ilmuta-31-45": ILMUTA_31_45_SCENES,
  "ilmuta-46-60": ILMUTA_46_60_SCENES,
};

const WORDS: WordPictureMap = Object.assign(
  {},
  ...Object.values(WORD_MANIFESTS),
);
const SCENES: ScenePictureMap = Object.assign(
  {},
  ...Object.values(SCENE_MANIFESTS),
);

export { scenePictureSrc, wordPictureSrc };

export type Picture =
  | { kind: "svg"; id: string; src: string }
  | { kind: "emoji"; emoji: string };

/** 낱말의 그린 그림 id. 없으면 undefined */
export function wordPictureId(ja: string): string | undefined {
  for (const form of lookupForms(ja))
    if (Object.hasOwn(WORDS, form)) return WORDS[form];
  return undefined;
}

/** 낱말에 붙일 그림: 그린 그림 → 그림 문자 → 없음 */
export function pictureOf(ja: string): Picture | undefined {
  const id = wordPictureId(ja);
  if (id) return { kind: "svg", id, src: wordPictureSrc(id) };
  const emoji = emojiOf(ja);
  return emoji ? { kind: "emoji", emoji } : undefined;
}

/** 강·과 장면 그림. 없으면 undefined */
export function sceneOf(
  book: Book,
  lessonNo: number,
  part: ScenePart = "conversation",
): (ScenePicture & { src: string }) | undefined {
  const key = sceneKey(book, lessonNo, part);
  if (!Object.hasOwn(SCENES, key)) return undefined;
  const scene = SCENES[key];
  return { ...scene, src: scenePictureSrc(scene.id) };
}
