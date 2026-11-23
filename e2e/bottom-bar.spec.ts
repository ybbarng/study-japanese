import { expect, type Page, test } from "@playwright/test";
import { login } from "./helpers/auth";

// 폰 강 화면 아래에는 이전·다음 단추와 재생 막대가 겹겹이 떠 있다.
// 끝까지 내렸을 때 마지막 글이 그 뒤로 숨거나, 단추 틈으로 글이 비쳐 보이면 안 된다.

/** 화면 아래에 떠 있는 단추 영역의 위쪽 끝과, 그 영역이 화면 끝까지 덮는지 */
async function bottomLayout(page: Page) {
  return page.evaluate(() => {
    const nav = document.querySelector<HTMLElement>("[data-bottom-nav]");
    const credit = [...document.querySelectorAll("aside")].find((a) =>
      a.textContent?.includes("자료:"),
    );
    if (!nav || !credit) return null;
    const n = nav.getBoundingClientRect();
    const bg = getComputedStyle(nav).backgroundColor;
    return {
      navTop: n.top,
      navBottom: n.bottom,
      viewport: window.innerHeight,
      creditBottom: credit.getBoundingClientRect().bottom,
      // rgba(…, a)에서 a가 1보다 작으면 뒤 글이 비친다
      opaque: !/rgba\(.*,\s*0(\.\d+)?\)$/.test(bg) && bg !== "transparent",
    };
  });
}

test("폰 강 화면에서 재생 막대가 떠 있어도 끝까지 내리면 마지막 글이 아래 단추에 가리지 않고, 단추 영역이 불투명하게 화면 끝까지 덮는다", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== "android-chrome",
    "PC는 단추가 글 흐름 안에 놓인다",
  );
  await login(page, "/ilmuta/1");
  await page.getByRole("button", { name: /강의 듣기/ }).click();
  await expect(
    page.getByRole("button", { name: "재생 화면 펼치기" }),
  ).toBeVisible();

  await page.evaluate(() =>
    window.scrollTo(0, document.documentElement.scrollHeight),
  );
  await expect
    .poll(async () => {
      const l = await bottomLayout(page);
      return l && l.creditBottom <= l.navTop;
    })
    .toBe(true);
  const l = await bottomLayout(page);
  expect(l?.opaque).toBe(true);
  // 단추와 재생 막대 사이 틈으로 글이 보이지 않게 단추 영역이 화면 맨 아래까지 이어진다
  expect(l?.navBottom).toBe(l?.viewport);
});

test("재생 막대가 떠 있을 때 가나 레슨 아래에 붙은 단계 표가 막대에 가리지 않는다", async ({
  page,
}) => {
  await login(page, "/ilmuta/1");
  await page.getByRole("button", { name: /강의 듣기/ }).click();
  const bar = page.locator("[data-player-bar]:visible");
  await expect(bar).toBeVisible();

  // 재생 대기열은 브라우저에 남으므로 다른 화면으로 옮겨 가도 막대가 그대로 뜬다
  await page.goto("/kana/lesson/h1");
  // 레슨 아래에 붙은 단계 표(소개·알아보기·…)
  const steps = page.locator("footer").getByText("소개", { exact: true });
  await expect(steps).toBeVisible();
  await expect(bar).toBeVisible();

  const stepsBox = await steps.boundingBox();
  const barBox = await bar.boundingBox();
  expect(stepsBox && barBox).toBeTruthy();
  if (!stepsBox || !barBox) return;
  expect(stepsBox.y + stepsBox.height).toBeLessThanOrEqual(barBox.y);
});
