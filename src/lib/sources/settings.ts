import type { DatabaseSync } from "node:sqlite";
import { z } from "zod";
import { getState, putState } from "@/lib/store/state";
import { DEFAULT_SITE_SETTINGS, type SiteSettings, SOURCES } from "./registry";

// 사이트 설정은 상태 문서 "site-settings" 하나에 둔다(관리자만 바꾼다).
const KEY = "site-settings";
const schema = z.object({ closedSources: z.array(z.string()) });

export function readSiteSettings(db: DatabaseSync): SiteSettings {
  const doc = getState(db, KEY);
  const parsed = schema.safeParse(doc?.value);
  return parsed.success ? parsed.data : DEFAULT_SITE_SETTINGS;
}

/** 모르는 출처 id는 버리고 저장한다 */
export function writeSiteSettings(
  db: DatabaseSync,
  settings: SiteSettings,
  now: number,
): SiteSettings {
  const known = new Set(SOURCES.map((s) => s.id));
  const value: SiteSettings = {
    closedSources: [...new Set(settings.closedSources)].filter((id) =>
      known.has(id),
    ),
  };
  putState(db, { key: KEY, value, updatedAt: now });
  return value;
}
