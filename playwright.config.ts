import { defineConfig, devices } from "@playwright/test";
import { E2E_PASSWORD } from "./e2e/helpers/auth";

// 브라우저 E2E. 빌드해 둔 앱(next build)을 가짜 교재로 띄워 핵심 흐름을 돈다.
// `pnpm test:e2e`가 빌드한 뒤 부른다. 매 커밋 CI가 아니라 .github/workflows/e2e.yml에서 따로 돈다.

// 폰·PC 프로젝트마다 서버를 따로 띄운다. 들은 기록·받아 둔 강 같은 서버 상태가 서로 섞이지 않게
const PHONE_PORT = 3471;
const DESKTOP_PORT = 3472;
const urlOf = (port: number) => `http://localhost:${port}`;

function server(port: number) {
  return {
    command: "pnpm exec tsx e2e/serve.ts",
    url: `${urlOf(port)}/login`,
    reuseExistingServer: false,
    timeout: 60_000,
    stdout: "ignore" as const,
    stderr: "pipe" as const,
    env: {
      E2E_PORT: String(port),
      SITE_PASSWORD: E2E_PASSWORD,
      SESSION_SECRET: "e2e-session-secret-0123456789abcdef0123456789",
    },
  };
}

const PHONE = { ...devices["Pixel 7"], baseURL: urlOf(PHONE_PORT) };
const DESKTOP = {
  ...devices["Desktop Chrome"],
  viewport: { width: 1440, height: 900 },
  baseURL: urlOf(DESKTOP_PORT),
};

/**
 * 출처 닫기처럼 서버 전체 설정을 잠시 바꾸는 시험. 다른 시험과 함께 돌면 그동안 방문자 화면이
 * 403·404를 받아 엉뚱한 시험이 들쭉날쭉 깨진다
 */
const SHARED_STATE = /source-toggle\.spec\.ts$/;

export default defineConfig({
  testDir: "e2e",
  outputDir: "test-results/e2e",
  timeout: 30_000,
  expect: { timeout: 10_000 },
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 2,
  reporter: process.env.CI
    ? [
        ["github"],
        ["html", { open: "never", outputFolder: "playwright-report" }],
      ]
    : [["list"]],
  use: {
    locale: "ko-KR",
    timezoneId: "Asia/Seoul",
    trace: "retain-on-failure",
    // 시험은 실제 마이크를 쓰지 않는다. 따라 말하기 화면이 녹음을 요청해도 맥의 권한 창이 뜨지 않게 가짜 장치로
    launchOptions: {
      args: [
        "--use-fake-ui-for-media-stream",
        "--use-fake-device-for-media-stream",
      ],
    },
  },
  projects: [
    {
      // 평일엔 안드로이드 Chrome으로 걸으며 쓴다
      name: "android-chrome",
      testIgnore: SHARED_STATE,
      use: PHONE,
    },
    {
      // 주말엔 맥·윈도우 PC에 앉아 쓴다(docs/standing-rules.md "PC도 폰과 같은 급으로")
      name: "desktop-chrome",
      testIgnore: SHARED_STATE,
      use: DESKTOP,
    },
    // 서버 전체 설정을 바꾸는 시험: 같은 서버의 다른 시험이 다 끝난 뒤에 돈다
    {
      name: "android-chrome-sources",
      testMatch: SHARED_STATE,
      dependencies: ["android-chrome"],
      use: PHONE,
    },
    {
      name: "desktop-chrome-sources",
      testMatch: SHARED_STATE,
      dependencies: ["desktop-chrome"],
      use: DESKTOP,
    },
  ],
  webServer: [server(PHONE_PORT), server(DESKTOP_PORT)],
});
