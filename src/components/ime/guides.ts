import type { Device } from "@/lib/ime/device";

// 기기별 일본어 입력기 켜는 차례. 메뉴 이름은 OS 판마다 조금 다를 수 있다.

export interface Guide {
  device: Device;
  name: string;
  steps: string[];
  /** 한국어 ↔ 일본어 바꾸기 */
  switchKey: string;
  tips?: string[];
}

export const GUIDES: Guide[] = [
  {
    device: "android",
    name: "안드로이드 (Gboard)",
    steps: [
      "Gboard 설정을 엽니다. 자판이 떠 있을 때 톱니바퀴를 누르거나, 폰 설정 → 시스템 → 키보드 → Gboard로 갑니다.",
      "언어 → 키보드 추가를 누릅니다.",
      "일본어(日本語)를 고릅니다.",
      "자판 모양은 처음엔 「QWERTY(로마자)」를 고르고 완료를 누릅니다. 익숙해지면 「12키(플릭)」을 더해 써 봅니다.",
    ],
    switchKey: "자판의 지구본 키(또는 스페이스 바를 옆으로 밀기)",
    tips: [
      "Gboard가 없으면 Play 스토어에서 「Gboard」를 설치하고 기본 자판으로 정합니다.",
    ],
  },
  {
    device: "windows",
    name: "윈도우 11",
    steps: [
      "설정 → 시간 및 언어 → 언어 및 지역으로 갑니다.",
      "「언어 추가」를 누르고 日本語(일본어)를 찾아 설치합니다. Microsoft IME가 함께 들어옵니다.",
    ],
    switchKey: "Win + Space",
    tips: [
      "일본어로 바꾼 뒤 가나 입력과 영문 입력은 Alt + `(물결표 키)로 오갑니다. 작업 표시줄에 「A」가 보이면 영문, 「あ」가 보이면 가나입니다.",
    ],
  },
  {
    device: "mac",
    name: "맥",
    steps: [
      "시스템 설정 → 키보드로 갑니다.",
      "입력 소스의 「편집…」을 누르고 왼쪽 아래 +를 누릅니다.",
      "일본어를 고르고 「로마자」 입력을 더합니다.",
    ],
    switchKey: "Ctrl + Space 또는 지구본(fn) 키",
  },
  {
    device: "ios",
    name: "아이폰·아이패드",
    steps: [
      "설정 → 일반 → 키보드 → 키보드 → 새로운 키보드 추가로 갑니다.",
      "일본어를 고르고 「로마자」를 켭니다.",
    ],
    switchKey: "자판의 지구본 키",
  },
];

/** 로마자로 칠 때 자주 헷갈리는 것 */
export const ROMAJI_TIPS: { kana: string; keys: string; note: string }[] = [
  { kana: "し", keys: "shi 또는 si", note: "" },
  { kana: "ち", keys: "chi 또는 ti", note: "" },
  { kana: "つ", keys: "tsu 또는 tu", note: "" },
  { kana: "ふ", keys: "fu 또는 hu", note: "" },
  { kana: "じ", keys: "ji 또는 zi", note: "" },
  {
    kana: "ん",
    keys: "nn",
    note: "n 하나 뒤에 모음이 오면 な행이 됩니다(kani → かに, kanni → かんい)",
  },
  {
    kana: "っ",
    keys: "자음 두 번",
    note: "kitte → きって, zasshi → ざっし",
  },
  { kana: "を", keys: "wo", note: "o만 치면 お가 됩니다" },
  {
    kana: "ー",
    keys: "-",
    note: "가타카나 장음: ko-hi- → こーひー → 변환하면 コーヒー",
  },
  {
    kana: "ゃ ゅ ょ",
    keys: "kya · shu · cho",
    note: "작은 글자만 따로: xya 또는 lya",
  },
];
