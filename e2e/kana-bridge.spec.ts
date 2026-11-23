import { expect, test } from "@playwright/test";
import { login } from "./helpers/auth";

test("가나 첫 읽기에서 배운 글자로 고른 교재 문장을 읽고, 뜻을 본 뒤 1강으로 넘어간다", async ({
  page,
}) => {
  await login(page, "/kana/read/read-h");
  // 가짜 교재 1~3강에 같은 문장이 있어 강마다 하나씩 3문장이 골린다
  await expect(page.getByText(/읽을 수 있는 3개를 골랐어요/)).toBeVisible();
  await page.getByRole("button", { name: "읽기 시작" }).click();

  await expect(page.getByText("1 / 3", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "山 읽는 법 やま 듣기" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "뜻 보기" }).click();
  await expect(page.getByRole("button", { name: "산 위." })).toBeVisible();

  await page.getByRole("button", { name: "다음 문장" }).click();
  await page.getByRole("button", { name: "다음 문장" }).click();
  await page.getByRole("button", { name: "다 읽었어요" }).click();
  await expect(page.getByText("3문장을 읽었어요")).toBeVisible();
  await page.getByRole("link", { name: "1강으로 →" }).click();
  await expect(page).toHaveURL("/ilmuta/1");
});
