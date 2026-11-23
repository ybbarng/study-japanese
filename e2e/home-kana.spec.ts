import { expect, test } from "@playwright/test";
import { login } from "./helpers/auth";

test("첫 화면에서 가나로 들어가 첫 레슨을 시작하고 다음 장으로 넘긴다", async ({
  page,
}) => {
  await login(page);
  await page.getByRole("link", { name: /かな/ }).click();
  await expect(page).toHaveURL("/kana");

  await page.getByRole("link", { name: /첫걸음/ }).click();
  await expect(page).toHaveURL(/\/kana\/lesson\//);
  const counter = page.getByText(/^1 \/ \d+$/);
  await expect(counter).toBeVisible();

  await page.getByRole("button", { name: "다음", exact: true }).click();
  await expect(page.getByText(/^2 \/ \d+$/)).toBeVisible();
});
