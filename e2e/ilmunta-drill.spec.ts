import { expect, type Page, test } from "@playwright/test";
import { login } from "./helpers/auth";
import {
  answerFor,
  type CardText,
  sentenceAnswerFor,
} from "./helpers/drill-answer";

const streakOf = (page: Page) =>
  page
    .getByText("연속", { exact: true })
    .locator("xpath=preceding-sibling::span[1]");

/** 문장 문제에 보인 글(읽는 법 루비는 뺀다) */
async function shownSentence(page: Page): Promise<string> {
  const line = page.locator("p:has([data-testid=drill-blank])");
  await expect(line).toBeVisible();
  return line.evaluate((el) => {
    const copy = el.cloneNode(true) as HTMLElement;
    for (const rt of copy.querySelectorAll("rt")) rt.remove();
    return (copy.textContent ?? "").replace(/\s/g, "");
  });
}

test("일문따 활용 드릴은 기본으로 문장 속 빈칸을 내고, 틀리면 정답을 채운 문장과 뜻을 보인 뒤 Enter로 넘긴다", async ({
  page,
}) => {
  await login(page, "/ilmunta/drill");
  await page.getByRole("button", { name: "쓰기", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "문장 속 빈칸" }),
  ).toHaveAttribute("aria-pressed", "true");

  // 뜻은 가려져 있다가 누르면 보인다
  const meaning = page.getByRole("button", { name: "뜻 보기" });
  await expect(meaning).toHaveAttribute("aria-expanded", "false");
  await meaning.click();
  await expect(
    page.locator("button[aria-expanded=true]").filter({ hasText: /[가-힣]/ }),
  ).toBeVisible();

  // 일부러 틀린다: 정답을 채운 문장·규칙이 보인다
  const first = await shownSentence(page);
  expect(sentenceAnswerFor(first)).not.toBe("ぬ");
  const input = page.getByLabel("답");
  await input.fill("ぬ");
  await input.press("Enter");
  await expect(page.getByText("다시 보기")).toBeVisible();
  const filled = page.getByTestId("drill-filled");
  await expect(filled).toBeVisible();
  const filledText = await filled.evaluate((el) => {
    const copy = el.cloneNode(true) as HTMLElement;
    for (const rt of copy.querySelectorAll("rt")) rt.remove();
    return copy.textContent ?? "";
  });
  expect(filledText).toMatch(/[가-힣]/);
  await expect(streakOf(page)).toHaveText("0");

  // Enter로 다음 문제. 새 문제의 뜻은 다시 가려진다
  await input.press("Enter");
  await expect(page.getByTestId("drill-filled")).toBeHidden();
  await expect(page.getByRole("button", { name: "뜻 보기" })).toBeVisible();

  // 이번엔 맞힌다
  const second = await shownSentence(page);
  await input.fill(sentenceAnswerFor(second));
  await input.press("Enter");
  await expect(page.getByText("맞았어요")).toBeVisible();
  await expect(streakOf(page)).toHaveText("1");
});

test("활용표만 빠르게: 보인 문제를 맞히면 맞았다고 하고 연속 기록이 1이 된다", async ({
  page,
}) => {
  await login(page, "/ilmunta/drill");
  await page.getByRole("button", { name: "쓰기", exact: true }).click();
  await page.getByRole("button", { name: "활용표만 빠르게" }).click();

  // 문제 카드: 주어진 꼴 · 낱말 · 뜻 · ↓ · 만들 꼴 · 뜻
  const card = page.locator("div:has(> span[aria-hidden]:text-is('↓'))");
  await expect(card).toBeVisible();
  const text = await card.evaluate((el): CardText => {
    const parts = [...el.children].map((child) => {
      const copy = child.cloneNode(true) as HTMLElement;
      for (const rt of copy.querySelectorAll("rt")) rt.remove();
      return (copy.textContent ?? "").trim();
    });
    return {
      givenTag: parts[0],
      given: parts[1],
      givenKo: parts[2],
      target: parts[4],
      targetKo: parts[5],
    };
  });

  await page.getByLabel("답").fill(answerFor(text));
  await page.getByRole("button", { name: "확인" }).click();

  // 맞히면 0.65초 보여 준 뒤 다음 문제로 넘어가므로 연속 기록으로도 확인한다
  await expect(page.getByText("맞았어요")).toBeVisible();
  await expect(streakOf(page)).toHaveText("1");
});
