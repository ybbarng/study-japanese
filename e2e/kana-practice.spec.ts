import { expect, test } from "@playwright/test";
import { drawStroke, guideStrokes, traceGuide } from "./helpers/strokes";

test.beforeEach(async ({ page }) => {
  await page.goto("/kana/write");
  await expect(page.locator("svg[data-stroke-guide]")).toBeVisible();
});

test("써 보기: 본보기 획순대로 따라 쓰면 한 글자를 다 쓰고 기록이 남는다", async ({
  page,
}) => {
  const pad = page.getByLabel(/써 보기 칸$/);
  // 따라 쓰기 단계: 다음에 쓸 획(1획)이 진하게 보인다
  await expect(page.locator("[data-next-stroke]")).toHaveAttribute(
    "data-next-stroke",
    "0",
  );
  const n = await traceGuide(page, pad);
  await expect(
    page.getByText("다 썼어요! 획순·방향 모두 맞았어요."),
  ).toBeVisible();
  expect(n).toBe(3); // あ

  // 쓴 글자에 표시가 붙는다(이 브라우저 진도에 기록)
  const written = await page.evaluate(
    () => JSON.parse(localStorage.getItem("kana-state") ?? "{}").state?.writes,
  );
  expect(written).toEqual({
    "hira:a": { done: 1, solo: 0, last: expect.any(Number) },
  });
});

test("써 보기: 획을 거꾸로 그으면 그 획만 틀렸다고 하고 지운다", async ({
  page,
}) => {
  const pad = page.getByLabel(/써 보기 칸$/);
  const [first] = await guideStrokes(page);
  await drawStroke(page, pad, [...first].reverse());
  await expect(page.getByText(/1번째 획의 방향이 거꾸로예요/)).toBeVisible();
  // 틀린 획은 받지 않아 아직 1획째를 기다린다
  await expect(page.locator("[data-next-stroke]")).toHaveAttribute(
    "data-next-stroke",
    "0",
  );

  // 바르게 그으면 다음 획으로 넘어간다
  await drawStroke(page, pad, first);
  await expect(page.getByText("좋아요 · 1/3획")).toBeVisible();
  await expect(page.locator("[data-next-stroke]")).toHaveAttribute(
    "data-next-stroke",
    "1",
  );
});

test("써 보기: 다음 글자 단추(PC는 → 키)로 행을 이어 간다", async ({
  page,
  isMobile,
}) => {
  if (isMobile) await page.getByRole("button", { name: "다음 글자 →" }).click();
  else await page.keyboard.press("ArrowRight");
  await expect(page.locator("svg[data-stroke-guide]")).toHaveAttribute(
    "data-stroke-guide",
    "い",
  );
});
