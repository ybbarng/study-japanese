import { expect, type Locator, type Page, test } from "@playwright/test";
import { gotoWriteStep } from "./helpers/kana-lesson";
import { drawStroke, traceGuide } from "./helpers/strokes";

async function drawLine(
  page: Page,
  pad: Locator,
  from: [number, number],
  to: [number, number],
) {
  const steps = 10;
  await drawStroke(
    page,
    pad,
    Array.from({ length: steps + 1 }, (_, i) => [
      from[0] + ((to[0] - from[0]) * i) / steps,
      from[1] + ((to[1] - from[1]) * i) / steps,
    ]),
  );
}

test("가나 쓰기: 아무 선 셋은 통과하지 못하고 까닭과 획 번호를 보인다", async ({
  page,
}) => {
  test.slow(); // 소개·알아보기를 지나 쓰기 칸까지 가는 데 10초쯤 걸린다(부하가 크면 그 몇 배)
  const pad = await gotoWriteStep(page);
  await expect(page.getByText(/소리 글자를 써 보세요/)).toBeVisible();

  for (const x of [0.15, 0.5, 0.85])
    await drawLine(page, pad, [x, 0.1], [x, 0.9]);
  await page.getByRole("button", { name: "다 썼어요" }).click();

  await expect(page.getByText("본보기 밖으로 나간 선이 많아요.")).toBeVisible();
  await expect(page.getByRole("button", { name: "다음 글자" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "다시 쓰기" })).toBeVisible();
});

test("가나 쓰기: 획순 보기가 그려지고, 거꾸로 쓴 획은 틀리며 본보기 획순대로 쓰면 통과한다", async ({
  page,
}) => {
  test.slow();
  const pad = await gotoWriteStep(page);
  const strokes = Number(
    (await page.getByText(/· \d+획/).textContent())?.match(/(\d+)획/)?.[1],
  );
  // 본보기 위에 획 번호가 획 수만큼 붙는다
  await expect(page.locator("[data-stroke-number]")).toHaveCount(strokes);

  // 획순 보기: 획마다 하나씩 그리는 그림이 뜬다(그리는 동안만 있다)
  await page.getByRole("button", { name: "획순 보기" }).click();
  await expect(page.locator("[data-stroke-play] path")).toHaveCount(strokes);

  // 첫 획만 거꾸로 그으면 모양은 덮어도 방향이 틀렸다고 한다
  await traceGuide(page, pad, [0]);
  await page.getByRole("button", { name: "다 썼어요" }).click();
  await expect(page.getByText(/1번째 획의 방향이 거꾸로예요/)).toBeVisible();
  await expect(page.getByRole("button", { name: "다음 글자" })).toHaveCount(0);

  // 본보기 차례·방향대로 다시 쓰면 통과한다
  await page.getByRole("button", { name: "다시 쓰기" }).click();
  await traceGuide(page, pad);
  await page.getByRole("button", { name: "다 썼어요" }).click();
  await expect(page.getByText(/잘 썼어요!/)).toBeVisible();
  await page.getByRole("button", { name: "다음 글자" }).click();
  await expect(page.getByText(/^2 \/ \d+$/)).toBeVisible();
});
