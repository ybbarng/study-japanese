import type { ScenePictureMap } from "../types";

// 일무따 46~60강 회화 장면 그림. 장면 열쇠(types.ts sceneKey) → public/pictures/scenes/<id>.svg
// label은 세션이 쓴 장면 설명이다(교재 문장을 옮기지 않는다).

export const SCENES: ScenePictureMap = {
  "ilmuta-46-conversation": {
    id: "ilmuta-46-conversation",
    label:
      "과일 가게에서 손님이 손을 내밀고, 앞치마를 두른 점원이 거스름돈을 건넨다. 진열대에 사과와 귤이 있다.",
  },
  "ilmuta-47-conversation": {
    id: "ilmuta-47-conversation",
    label:
      "슈퍼 진열대 앞에서 두 친구가 마주쳐 한 사람이 반갑게 손을 흔든다. 다른 사람의 장바구니에 고기가 있다.",
  },
  "ilmuta-48-conversation": {
    id: "ilmuta-48-conversation",
    label:
      "탁자 위에 펼친 잡지의 영화 장면을 한 사람이 가리키고, 다른 사람이 영화를 함께 보러 가자고 한다.",
  },
  "ilmuta-49-conversation": {
    id: "ilmuta-49-conversation",
    label:
      "두 친구가 꿈 이야기를 한다. 한 사람은 예전 꿈이던 선생님을 지우고 어깨를 으쓱하고, 다른 사람은 옷을 짓는 꿈을 떠올린다.",
  },
  "ilmuta-50-conversation": {
    id: "ilmuta-50-conversation",
    label:
      "찻집 탁자를 사이에 두고 두 사람이 이야기한다. 한 사람은 동생 둘을, 다른 사람은 집에 있는 개·고양이·새를 떠올린다.",
  },
};
