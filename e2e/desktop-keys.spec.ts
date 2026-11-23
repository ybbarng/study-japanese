import { expect, type Page, test } from "@playwright/test";
import { BASIC } from "@/lib/kana/data";
import { MATCH_KEYS } from "@/lib/kana/match-keys";
import { login } from "./helpers/auth";

// PC(1440×900)에서 마우스 없이 키보드만으로 하는 흐름: 짝 맞추기, 가나 첫 읽기, 일문따 범위 시험.
test.skip(
  ({ isMobile }) => isMobile,
  "PC 화면 전용 시험(폰 프로젝트는 건너뛴다)",
);

/** 짝 맞추기 칸 글자 → 소리 id(히라가나·가타카나 어느 쪽이든) */
function soundOf(char: string): string {
  const s = BASIC.find((x) => x.hira === char || x.kata === char);
  if (!s) throw new Error(`기본 가나가 아님: ${char}`);
  return s.id;
}

/** 아직 남은 칸들의 [칸 번호, 소리 id] */
async function openTiles(page: Page): Promise<[number, string][]> {
  const tiles = page.locator("button[aria-keyshortcuts]");
  const all = await tiles.evaluateAll((els) =>
    els.map((el) => ({
      text: el.querySelector("[lang=ja]")?.textContent ?? "",
      disabled: (el as HTMLButtonElement).disabled,
    })),
  );
  return all.flatMap((t, i): [number, string][] =>
    t.disabled ? [] : [[i, soundOf(t.text)]],
  );
}

test("PC 짝 맞추기를 자판 세 줄 키로 다 맞히고, Esc로 고른 칸을 풀며, 끝나면 Enter로 한 판 더 한다", async ({
  page,
}) => {
  await login(page, "/kana/game/match");
  const tiles = page.locator("button[aria-keyshortcuts]");
  await expect(tiles).toHaveCount(12);
  await expect(tiles.nth(0)).toHaveAttribute("aria-keyshortcuts", "Q");

  // Esc는 고른 칸을 푼다
  await page.keyboard.press("q");
  await expect(tiles.nth(0)).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.press("Escape");
  await expect(tiles.nth(0)).toHaveAttribute("aria-pressed", "false");

  const aside = page.getByRole("complementary", { name: "기록과 맞힌 짝" });
  for (let pair = 1; pair <= 6; pair++) {
    const open = await openTiles(page);
    const [a, sound] = open[0];
    const b = open.find(([i, s]) => i !== a && s === sound)?.[0];
    if (b === undefined) throw new Error(`짝이 없음: ${sound}`);
    await page.keyboard.press(MATCH_KEYS[a].toLowerCase());
    await page.keyboard.press(MATCH_KEYS[b].toLowerCase());
    // 마지막 짝을 맞히면 판 대신 기록 화면이 뜬다
    if (pair < 6) await expect(tiles.nth(b)).toBeDisabled();
    await expect(aside).toContainText(`맞힌 짝 ${pair} / 6`);
  }

  const again = page.getByRole("button", { name: "한 판 더" });
  await expect(again).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(tiles).toHaveCount(12);
  await expect(tiles.nth(0)).toBeEnabled();
  await expect(aside).toContainText("맞힌 짝 0 / 6");
});

test("PC 가나 첫 읽기를 Enter·숫자 키·Backspace로 읽고, 다 읽으면 Enter로 1강으로 간다", async ({
  page,
}) => {
  await login(page, "/kana/read/read-h");
  await expect(page.getByText(/읽을 수 있는 3개를 골랐어요/)).toBeVisible();
  await page.keyboard.press("Enter");
  await expect(page.getByText("1 / 3", { exact: true })).toBeVisible();

  // 3은 뜻, 1은 한글 소리
  await page.keyboard.press("3");
  await expect(page.getByRole("button", { name: "산 위." })).toBeVisible();
  await page.keyboard.press("1");
  await expect(
    page.getByRole("button", { name: "한글 소리 가리기" }),
  ).toBeVisible();

  await page.keyboard.press("Enter");
  await expect(page.getByText("2 / 3", { exact: true })).toBeVisible();
  // 새 문장에서는 뜻이 다시 가려진다
  await expect(page.getByRole("button", { name: "뜻 보기" })).toBeVisible();
  await page.keyboard.press("Backspace");
  await expect(page.getByText("1 / 3", { exact: true })).toBeVisible();

  // 곁칸 목록에서 지금 문장이 표시된다
  const list = page.getByRole("complementary", { name: "읽을 문장과 키보드" });
  await expect(list.locator("[aria-current=step]")).toContainText("1강");

  for (let k = 0; k < 3; k++) await page.keyboard.press("Enter");
  await expect(page.getByText("3문장을 읽었어요")).toBeVisible();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL("/ilmuta/1");
});

test("PC 일문따 범위 시험을 키보드만으로 푼다: Enter로 시작, 쓰기는 Enter, 고르기는 숫자 키, 끝나면 Enter로 틀린 문제 다시 풀기", async ({
  page,
}) => {
  await login(page, "/ilmunta/test/4");
  const start = page.getByRole("button", { name: "시작", exact: true });
  await expect(start).toBeFocused();
  await page.keyboard.press("Enter");

  const aside = page.getByRole("complementary", { name: "시험 진행" });
  await expect(aside).toContainText("남은 문제 30개");

  // 쓰기와 고르기가 번갈아 나온다(첫 문제가 쓰기). 쓰기는 일부러 틀리게 써서 다시 풀 문제를 남긴다
  for (let n = 1; n <= 30; n++) {
    await expect(page.getByText(`${n} / 30`, { exact: true })).toBeVisible();
    if (n % 2 === 1) {
      const input = page.getByLabel("답");
      await expect(input).toBeFocused();
      await input.fill("ぬ");
      await page.keyboard.press("Enter");
    } else {
      await page.keyboard.press("1");
    }
    if (n < 30) await expect(aside).toContainText(`남은 문제 ${30 - n}개`);
  }

  const retry = page.getByRole("button", { name: /틀린 \d+문제 다시 풀기/ });
  await expect(retry).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByText(/^다시 풀기 1 \/ \d+$/)).toBeVisible();
  await expect(page.getByLabel("답")).toBeFocused();
});
