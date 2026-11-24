import type { IlmutaLesson } from "@/lib/textbook/schema";

// 확인 문제 시험용 가짜 강. 교재 글이 아니라 모양만 같은 짧은 낱말·문장이다.

export function fakeLesson(no = 7): IlmutaLesson {
  const n = String(no).padStart(2, "0");
  return {
    no,
    title: "テスト",
    lecture: { file: `L${n}.mp3`, durationSec: 10 },
    examples: [
      {
        id: `${n}-2`,
        file: `${n}-2.mp3`,
        durationSec: 10,
        kind: "words",
        sentences: [
          { ja: "川", ko: "강", reading: "かわ" },
          { ja: "空", ko: "하늘", reading: "そら" },
          { ja: "花", ko: "꽃", reading: "はな" },
          { ja: "学校", ko: "학교", reading: "がっこう" },
          { ja: "ねこ", ko: "고양이" },
          { ja: "私", ko: "나(여자)", reading: "わたし" },
          { ja: "僕", ko: "나(남자)", reading: "ぼく" },
        ],
      },
      {
        id: `${n}-3`,
        file: `${n}-3.mp3`,
        durationSec: 10,
        kind: "patterns",
        patterns: [
          { no: 1, ja: "～は～だ。", ko: "~는 ~이다." },
          { no: 2, ja: "～も～だ。", ko: "~도 ~이다." },
          { no: 3, ja: "～の前に[まえに]", ko: "~전에" },
        ],
        sentences: [
          { ja: "川は川だ。", ko: "강은 강이다.", pattern: 1 },
          { ja: "空は空だ。", ko: "하늘은 하늘이다.", pattern: 1 },
          { ja: "花も花だ。", ko: "꽃도 꽃이다.", pattern: 2 },
          { ja: "ねこも空だ。", ko: "고양이도 하늘이다.", pattern: 2 },
          { ja: "学校の前に川。", ko: "학교 앞에 강.", pattern: 3 },
        ],
      },
      {
        id: `${n}-4-1`,
        file: `${n}-4-1.mp3`,
        durationSec: 10,
        kind: "conversationBasic",
        sentences: [
          { ja: "やあ、げんき？", ko: "안녕, 잘 지내?", speaker: "A" },
          { ja: "うん。", ko: "응.", speaker: "B" },
          { ja: "どこへいくの？", ko: "어디 가?", speaker: "A" },
          { ja: "がっこうへいく。", ko: "학교에 가.", speaker: "B" },
          { ja: "わたしもいく。", ko: "나도 갈래.", speaker: "A" },
        ],
      },
      {
        id: `${n}-4-2`,
        file: `${n}-4-2.mp3`,
        durationSec: 10,
        kind: "conversationAdvanced",
        sentences: [
          { ja: "やあ、げんき？", ko: "안녕, 잘 지내?", speaker: "A" },
          { ja: "うん。", ko: "응.", speaker: "B" },
          { ja: "どこへいくの？", ko: "어디 가?", speaker: "A" },
          { ja: "がっこうへいく。", ko: "학교에 가.", speaker: "B" },
          { ja: "わたしもいく。", ko: "나도 갈래.", speaker: "A" },
        ],
      },
    ],
  };
}
