import { expect, test } from "@playwright/test";
import { login } from "./helpers/auth";
import { audioIsPlaying, listenSummary } from "./helpers/listen";

test("일무따 강 화면에서 강의를 틀면 재생 막대·펼친 재생 화면이 뜨고 들은 기록이 서버에 남는다", async ({
  page,
}) => {
  await login(page, "/ilmuta/1");
  await expect(
    page.getByRole("heading", { level: 1, name: "テスト1だ。" }),
  ).toBeVisible();
  expect(await listenSummary(page, "ilmuta", "L01")).toBeNull();

  await page.getByRole("button", { name: /강의 듣기/ }).click();

  const bar = page.getByRole("button", { name: "재생 화면 펼치기" });
  await expect(bar).toContainText("1강 강의");
  await expect.poll(() => audioIsPlaying(page)).toBe(true);

  await bar.click();
  await expect(page.getByText("1 / 4", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "접기" }).click();
  await expect(page.getByRole("button", { name: "접기" })).toBeHidden();

  // 3초짜리 강의가 끝나면 재생기가 들은 기록을 서버로 보내고 다음 예문으로 넘어간다
  await expect
    .poll(
      async () => (await listenSummary(page, "ilmuta", "L01"))?.completedPlays,
      {
        timeout: 15_000,
      },
    )
    .toBe(1);
  await expect(bar).toContainText("1강 기본 회화 듣기");
});
