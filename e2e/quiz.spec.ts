import { expect, test } from "@playwright/test";
import { QUIZ_LESSON } from "./fixtures/textbook";
import { optionIndex, rightLabel, wordsQuiz } from "./helpers/quiz";

// 강 화면 교재 영역의 구역 끝 확인 문제: 그 자리에서 풀고, 틀리면 정답·다시 듣기가 보이고, 맞히면 넘어간다.

const LESSON = `/ilmuta/${QUIZ_LESSON}`;

test("단어 구역 끝 확인 문제를 틀리면 정답과 그 문장 다시 듣기가 보이고, 다시 듣기를 누르면 소리가 난다", async ({
  page,
}) => {
  await page.goto(LESSON);
  const quiz = wordsQuiz(page);
  await quiz.scrollIntoViewIfNeeded();
  await expect(quiz.getByText("1 / 3")).toBeAttached();

  const right = await rightLabel(quiz);
  await quiz
    .locator("ul li button")
    .nth(await optionIndex(quiz, right, false))
    .click();

  await expect(quiz.getByText("아쉬워요.")).toBeVisible();
  await expect(quiz.getByText(`정답은 ${right}`)).toBeVisible();
  const replay = quiz.getByRole("button", { name: "▶ 그 문장 다시 듣기" });
  await expect(replay).toBeVisible();
  await replay.click();
  await expect(quiz.getByRole("button", { name: "듣는 중…" })).toBeVisible();

  // 다음으로 넘기면 틀린 문제를 끝에 한 번 더 내서 문제 수가 늘어 있다
  await quiz.getByRole("button", { name: /다음/ }).click();
  await expect(quiz.getByText("2 / 4")).toBeAttached();
});

test("맞히면 짧게 '맞았어요'를 보이고 다음 문제로 넘어간다", async ({
  page,
}) => {
  await page.goto(LESSON);
  const quiz = wordsQuiz(page);
  await quiz.scrollIntoViewIfNeeded();
  await expect(quiz.getByText("1 / 3")).toBeAttached();
  const right = await rightLabel(quiz);
  await quiz
    .locator("ul li button")
    .nth(await optionIndex(quiz, right, true))
    .click();
  await expect(quiz.getByText("맞았어요")).toBeVisible();
  await expect(quiz.getByText("2 / 3")).toBeAttached();
});

test("PC에서는 숫자 키로 고르고 Enter로 다음 문제로 넘긴다", async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, "키보드는 PC에서만");
  await page.goto(LESSON);
  const quiz = wordsQuiz(page);
  await quiz.scrollIntoViewIfNeeded();
  await expect(quiz.getByText("1 / 3")).toBeAttached();
  const right = await rightLabel(quiz);
  const wrong = await optionIndex(quiz, right, false);
  // 듣기 문제의 '글로 보기'를 누르면 초점이 묶음 안에 남는다. 초점을 빼도 화면에 보이는 묶음이 키를 받는다
  await page.evaluate(() => (document.activeElement as HTMLElement)?.blur());
  await page.keyboard.press(String(wrong + 1));
  await expect(quiz.getByText("아쉬워요.")).toBeVisible();
  await page.keyboard.press("Enter");
  await expect(quiz.getByText("2 / 4")).toBeAttached();
});

test("문형 구역 끝에도 확인 문제가 나온다", async ({ page }) => {
  await page.goto(LESSON);
  const quiz = page
    .locator("#step-patterns")
    .getByRole("region", { name: /확인 문제 · 문형/ });
  await quiz.scrollIntoViewIfNeeded();
  await expect(
    quiz.getByText(/빈칸에 들어갈 말은\?|들은 문장의 뜻은\?/),
  ).toBeVisible();
});
