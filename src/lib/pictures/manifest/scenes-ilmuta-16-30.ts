import type { ScenePictureMap } from "../types";

// 일무따 16~30강 회화 장면 그림. 장면 열쇠(types.ts sceneKey) → public/pictures/scenes/<id>.svg
// label은 세션이 쓴 장면 설명이다(교재 문장을 옮기지 않는다).

export const SCENES: ScenePictureMap = {
  "ilmuta-16-conversation": {
    id: "ilmuta-16-conversation",
    label:
      "더운 날 실내에서 한 사람이 시원한 주스를 내밀고, 다른 사람이 땀을 흘리며 손으로 부친다.",
  },
  "ilmuta-17-conversation": {
    id: "ilmuta-17-conversation",
    label:
      "카페 탁자에서 한 사람이 휴대폰 속 여자 친구를 자랑하며 맛있는 요리를 떠올리고, 친구가 궁금해한다.",
  },
  "ilmuta-18-conversation": {
    id: "ilmuta-18-conversation",
    label:
      "눈 오는 날 바깥에서 두 사람이 인사한다. 한 사람은 드라마를, 다른 사람은 영화를 떠올린다.",
  },
  "ilmuta-19-conversation": {
    id: "ilmuta-19-conversation",
    label:
      "밥상에 밥공기 둘이 놓인 방에서 남자가 텔레비전 속 여배우를 보며 웃고, 여자가 못마땅하게 묻는다.",
  },
  "ilmuta-20-conversation": {
    id: "ilmuta-20-conversation",
    label:
      "남자가 잡지의 영화 광고를 보여 주며 함께 보자고 하고, 여자는 셋이 함께 가는 것을 떠올린다. 벽 달력에 모레가 표시돼 있다.",
  },
};
