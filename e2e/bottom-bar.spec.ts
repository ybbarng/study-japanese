import { expect, type Page, test } from "@playwright/test";
import { login } from "./helpers/auth";

// 재생기 자리. 강 화면(일무따 강·일문따 과)은 재생기를 화면 안에 붙인다: 폰은 화면 위(내려 읽으면 한 줄로
// 접힌다), PC는 오른쪽 칸 맨 위. 그 밖의 화면은 아래 막대를 쓴다. 어느 쪽이든 글을 가리면 안 된다.

/** 화면 안 재생기의 위치와 접혔는지, 출처 글(강 화면 맨 끝 글)의 아래 끝 */
async function topLayout(page: Page) {
  return page.evaluate(() => {
    const el = [
      ...document.querySelectorAll<HTMLElement>("[data-inline-player]"),
    ].find((e) => e.getBoundingClientRect().height > 0);
    const credit = [...document.querySelectorAll("aside")].find((a) =>
      a.textContent?.includes("자료:"),
    );
    if (!el || !credit) return null;
    const r = el.getBoundingClientRect();
    return {
      top: r.top,
      bottom: r.bottom,
      collapsed: el.hasAttribute("data-collapsed"),
      viewport: window.innerHeight,
      creditTop: credit.getBoundingClientRect().top,
      creditBottom: credit.getBoundingClientRect().bottom,
    };
  });
}

test("폰 강 화면은 재생기가 위에 붙어, 내려 읽으면 한 줄로 접히고 위로 올리면 펴지며, 끝까지 내려도 마지막 글이 가리지 않는다", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== "android-chrome",
    "PC는 재생기가 오른쪽 칸에 있다",
  );
  // 3강은 강의가 길어(40초) 시험 중에 끝나지 않는다(1강 들은 기록을 보는 시험과 겹치지 않게)
  await login(page, "/ilmuta/3");
  await page.getByRole("button", { name: "강의 듣기" }).click();
  await expect(
    page.getByRole("button", { name: "재생 화면 펼치기" }),
  ).toBeVisible();
  // 강 화면에서는 아래 막대를 따로 띄우지 않는다
  await expect(
    page.locator("[data-player-bar]").locator("visible=true"),
  ).toHaveCount(1);
  // 느린 폰(과 CI)처럼 CPU를 늦춘다. 글 끝에서 접히면 문서가 짧아져 브라우저가 스크롤을 끌어올리는데,
  // 느린 기기에서 그 움직임을 위로 올린 것으로 읽어 접히자마자 다시 펴지던 일이 있었다
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 6 });

  // 끝까지 내리면 재생기는 화면 위에 한 줄로 붙고, 마지막 글은 화면 안(재생기 아래)에 다 보인다.
  // 재생기가 접히며 높이가 바뀌면 부드러운 스크롤이 끊기므로, 볼 때마다 끝으로 곧장 옮긴다
  await expect
    .poll(async () => {
      await page.evaluate(() =>
        window.scrollTo({
          top: document.documentElement.scrollHeight,
          behavior: "instant",
        }),
      );
      const l = await topLayout(page);
      return (
        !!l &&
        l.collapsed &&
        l.top <= 1 &&
        l.creditBottom <= l.viewport &&
        l.creditTop >= l.bottom
      );
    })
    .toBe(true);
  // 접힌 재생기는 한 줄(재생·시간·진행) + 지금 하는 말 한두 줄만 차지한다
  const collapsed = await topLayout(page);
  expect(collapsed && collapsed.bottom - collapsed.top).toBeLessThan(130);
  await expect(
    page
      .locator("[data-inline-player] [data-player-time]")
      .locator("visible=true"),
  ).toBeVisible();

  // 위로 조금 올리면 다시 편다(시간·조작이 다 보인다)
  // (접힌 직후 0.35초 동안의 움직임은 접힘이 만든 위치 보정으로 보고 넘기므로, 사람처럼 이어서 올린다)
  await expect
    .poll(async () => {
      await page.evaluate(() =>
        window.scrollBy({ top: -150, behavior: "instant" }),
      );
      return (await topLayout(page))?.collapsed;
    })
    .toBe(false);
  await expect(page.getByRole("button", { name: "A–B" })).toBeVisible();
});

test("PC 일문따 과 화면은 오른쪽 칸 맨 위에 재생기를 두고 아래 막대를 띄우지 않으며, 칸이 다 자라도 끝이 화면 안에 있다", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== "desktop-chrome",
    "폰은 자막 곁칸이 없다",
  );
  await login(page, "/ilmunta/1");
  await page.getByRole("button", { name: /처음부터 듣기|이어서 듣기/ }).click();
  const aside = page.getByRole("complementary", { name: "강의 자막" });
  await expect(
    aside.locator("[data-inline-player] [data-player-time]"),
  ).toBeVisible();
  await expect(
    page.locator("[data-player-bar]").locator("visible=true"),
  ).toHaveCount(1);
  await page.evaluate(() => window.scrollTo(0, 0));

  // 칸이 가장 크게 자랐을 때의 끝(지금 위치 + 최대 높이)이 화면 아래보다 위여야 한다.
  // 자막 길이와 상관없이 보려고 실제 높이가 아니라 최대 높이로 잰다
  await expect
    .poll(() =>
      page.evaluate(() => {
        const panel = document.querySelector<HTMLElement>(
          'aside[aria-label="강의 자막"] [data-sticky-panel]',
        );
        if (!panel) return null;
        const max = Number.parseFloat(getComputedStyle(panel).maxHeight);
        return panel.getBoundingClientRect().top + max <= window.innerHeight;
      }),
    )
    .toBe(true);
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
