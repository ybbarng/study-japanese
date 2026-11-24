import { expect, test } from "@playwright/test";
import { login } from "./helpers/auth";

// 출처 닫기는 서버 전체 설정을 바꾼다. 닫혀 있는 동안 같은 서버의 방문자 시험(강 화면·낱말 사전 등)이
// 403·404를 받아 깨지므로, 이 파일은 playwright.config.ts의 "-sources" 프로젝트에서 다른 시험이 모두
// 끝난 뒤에 따로 돈다(2026-11-24 낱말 사전 시험이 이 시험과 겹쳐 404를 받은 일).

const LECTURE_URL =
  "/media/ilmuta/1.%20%EC%9D%8C%EC%84%B1%20%EA%B0%95%EC%9D%98/L01.mp3";

/** 소책자 글을 싣는 화면(가나 다리 레슨, 바로 틀 강을 실어 보내는 첫 화면) */
const TEXT_PAGES = ["/kana/read/read-h", "/"];
/** 가짜 교재 소책자의 뜻 글(e2e/fixtures/textbook.ts) */
const BOOKLET_TEXT = /산 위\.|안녕, 시험\.|~는 ~이다\./;

test("관리자가 출처를 닫으면 방문자는 그 자료를 받지 못하고, 다시 열면 받는다", async ({
  page,
  browser,
}) => {
  await login(page, "/settings");
  // 0강(예문 없음) 강의를 다 들은 것으로 남겨, 첫 화면이 예문이 있는 강을 "바로 틀 강"으로 싣게 한다
  const listened = await page.request.post("/api/listen", {
    data: {
      events: [
        {
          clientId: "e2e-sources-0001",
          book: "ilmuta",
          item: "L00",
          kind: "lecture",
          startedAt: Date.UTC(2027, 0, 4),
          listenedSec: 3,
          completed: true,
        },
      ],
    },
  });
  expect(listened.status()).toBe(200);
  const visitor = await browser.newContext();
  const toggle = page
    .getByRole("switch", { name: /무작정 따라하기.*공개/ })
    .first();
  try {
    await toggle.click();
    await expect(toggle).toHaveText("닫힘");
    expect((await visitor.request.get(LECTURE_URL)).status()).toBe(403);
    expect((await page.request.get(LECTURE_URL)).status()).toBe(200);
    // 오디오만이 아니라 화면 데이터(가나 다리 레슨·첫 화면에 실어 보내는 강)에도 소책자 글이 없어야 한다
    for (const url of TEXT_PAGES)
      expect(await visitor.request.get(url).then((r) => r.text())).not.toMatch(
        BOOKLET_TEXT,
      );

    await toggle.click();
    await expect(toggle).toHaveText("공개");
    expect((await visitor.request.get(LECTURE_URL)).status()).toBe(200);
    for (const url of TEXT_PAGES)
      expect(await visitor.request.get(url).then((r) => r.text())).toMatch(
        BOOKLET_TEXT,
      );
  } finally {
    await visitor.close();
  }
});
