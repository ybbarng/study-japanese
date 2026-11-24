import type { ScenePictureMap } from "../types";

// 일무따 31~45강 회화 장면 그림. 장면 열쇠(types.ts sceneKey) → public/pictures/scenes/<id>.svg
// label은 세션이 쓴 장면 설명이다(교재 문장을 옮기지 않는다).

export const SCENES: ScenePictureMap = {
  "ilmuta-31-conversation": {
    id: "ilmuta-31-conversation",
    label:
      "아침에 집에 있는 사람과 버스에서 막 내린 사람이 서로 전화로 이야기한다.",
  },
  "ilmuta-32-conversation": {
    id: "ilmuta-32-conversation",
    label:
      "아침 사무실에서 한 사람이 인사하며, 밤을 새워 눈이 빨개진 동료에게 까닭을 묻는다.",
  },
  "ilmuta-33-conversation": {
    id: "ilmuta-33-conversation",
    label:
      "교실 책상에 숙제 공책이 놓여 있고, 여학생이 베낀 공책을 들어 보이자 남학생이 신나 한다.",
  },
  "ilmuta-34-conversation": {
    id: "ilmuta-34-conversation",
    label:
      "저녁 길에서 여행 가방을 끌고 돌아온 남자와 노래 연습을 하고 온 여자가 마주친다.",
  },
  "ilmuta-35-conversation": {
    id: "ilmuta-35-conversation",
    label:
      "더운 날 공항에 막 도착한 사람이 외투를 벗어 들고 전화를 건다. 뒤로 비행기가 뜬다.",
  },
};
