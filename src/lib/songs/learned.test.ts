import { describe, expect, it } from "vitest";
import { fakeExample, fakeLesson } from "@/lib/ilmuta/__fixtures__/lesson";
import { buildLearnedIndex, learnedForSong, learnedLessonOf } from "./learned";

const lessons = [
  fakeLesson(3, {
    examples: [
      fakeExample("03-2", "words", {
        sentences: [
          { ja: "雨", ko: "비", reading: "あめ" },
          { ja: "降る。", ko: "내리다", reading: "ふる" },
        ],
      }),
    ],
    conversationWords: [{ ja: "夢", ko: "꿈", reading: "ゆめ" }],
  }),
  fakeLesson(1, {
    examples: [
      fakeExample("01-2", "words", {
        sentences: [{ ja: "雨", ko: "비", reading: "あめ" }],
      }),
      fakeExample("01-3", "patterns", {
        sentences: [{ ja: "空", ko: "하늘" }],
      }),
    ],
  }),
];

describe("buildLearnedIndex", () => {
  it("단어 코너·회화 단어의 낱말을 처음 나온 강으로 모으고 끝 문장 부호는 뗀다", () => {
    expect(buildLearnedIndex(lessons)).toEqual({ 雨: 1, 降る: 3, 夢: 3 });
  });
});

describe("learnedForSong", () => {
  it("노래 분석에 나오는 낱말만 기본형·겉모양으로 골라 둔다", () => {
    // 지어낸 줄 "雨が降っていた"의 화면 조각. 夢은 분석이 없는 글이라 보지 않는다
    const byLine = [
      {
        tokens: [
          { surface: "雨", pos: "名詞" },
          { surface: "が", plain: true as const },
          { surface: "降っていた", base: "降る", pos: "動詞" },
          { surface: "夢", plain: true as const },
        ],
      },
      null,
    ];
    expect(learnedForSong(byLine, buildLearnedIndex(lessons))).toEqual({
      雨: 1,
      降る: 3,
    });
  });
});

describe("learnedLessonOf", () => {
  it("기본형을 먼저 보고, 없으면 겉모양, 둘 다 없으면 null", () => {
    const index = { 降る: 3, 雨: 1 };
    expect(learnedLessonOf({ base: "降る", surface: "降った" }, index)).toBe(3);
    expect(learnedLessonOf({ base: "雨", surface: "雨" }, index)).toBe(1);
    expect(learnedLessonOf({ base: "空", surface: "空" }, index)).toBeNull();
  });
});
