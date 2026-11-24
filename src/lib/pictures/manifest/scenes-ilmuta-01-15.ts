import type { ScenePictureMap } from "../types";

// 일무따 1~15강 회화 장면 그림. 장면 열쇠(types.ts sceneKey) → public/pictures/scenes/<id>.svg
// label은 세션이 쓴 장면 설명이다(교재 문장을 옮기지 않는다).

export const SCENES: ScenePictureMap = {
  "ilmuta-03-conversation": {
    id: "ilmuta-03-conversation",
    label:
      "한 사람이 우산을 내밀며 누구 것인지 묻고, 다른 사람이 자기를 가리킨다. 탁자에 가방이 있다.",
  },
};
