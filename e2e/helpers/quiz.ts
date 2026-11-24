import type { Locator, Page } from "@playwright/test";
import { QUIZ_WORDS } from "../fixtures/textbook";

// 강 화면 구역 끝 확인 문제를 푸는 도우미(quiz.spec.ts·offline.spec.ts)

export function wordsQuiz(page: Page): Locator {
  return page
    .locator("#step-words")
    .getByRole("region", { name: /확인 문제 · 단어/ });
}

/** 지금 문제의 정답 보기 글. 묻는 낱말을 가짜 교재에서 찾는다(듣기 문제는 '글로 보기'로 들린 낱말을 본다) */
export async function rightLabel(quiz: Locator): Promise<string> {
  const ask = (await quiz.textContent()) ?? "";
  if (ask.includes("들린 낱말은?"))
    await quiz.getByRole("button", { name: "글로 보기" }).click();
  const ja = await quiz
    .locator("[data-quiz-word]")
    .getAttribute("data-quiz-word");
  const word = QUIZ_WORDS.find((w) => w.ja === ja);
  if (!word) throw new Error(`문제의 낱말을 찾지 못함: ${ja}`);
  if (ask.includes("읽는 법은?") && "reading" in word) return word.reading;
  if (ask.includes("뜻은?")) return word.ko;
  return word.ja;
}

/** 보기 글(후리가나가 붙으면 innerText에 읽는 법이 섞이므로 앞부분으로 견준다) */
export async function optionIndex(quiz: Locator, label: string, same: boolean) {
  const labels = await quiz.locator("ul li button").allInnerTexts();
  return labels.findIndex(
    (l) =>
      l
        .replace(/^\d\s*/, "")
        .trim()
        .startsWith(label) === same,
  );
}
