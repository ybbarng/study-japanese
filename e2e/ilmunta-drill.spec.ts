import { expect, test } from "@playwright/test";
import { login } from "./helpers/auth";
import { answerFor, type CardText } from "./helpers/drill-answer";

test("일문따 활용 드릴에서 보인 문제를 맞히면 맞았다고 하고 연속 기록이 1이 된다", async ({
  page,
}) => {
  await login(page, "/ilmunta/drill");
  await page.getByRole("button", { name: "쓰기", exact: true }).click();

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
  const streak = page
    .getByText("연속", { exact: true })
    .locator("xpath=preceding-sibling::span[1]");
  await expect(streak).toHaveText("1");
});
