import { describe, expect, it } from "vitest";
import { openDb } from "@/lib/store/db";
import { readSiteSettings, writeSiteSettings } from "./settings";

const NOW = Date.UTC(2027, 0, 2);

describe("사이트 설정", () => {
  it("저장한 적이 없으면 모든 출처가 공개다", () => {
    expect(readSiteSettings(openDb(":memory:"))).toEqual({ closedSources: [] });
  });

  it("닫은 출처를 저장하고 다시 읽는다", () => {
    const db = openDb(":memory:");
    writeSiteSettings(db, { closedSources: ["gilbut-ilmuta"] }, NOW);
    expect(readSiteSettings(db)).toEqual({ closedSources: ["gilbut-ilmuta"] });
  });

  it("모르는 출처 id와 겹친 id는 버린다", () => {
    const db = openDb(":memory:");
    const saved = writeSiteSettings(
      db,
      { closedSources: ["nope", "gilbut-ilmunta", "gilbut-ilmunta"] },
      NOW,
    );
    expect(saved).toEqual({ closedSources: ["gilbut-ilmunta"] });
  });
});
