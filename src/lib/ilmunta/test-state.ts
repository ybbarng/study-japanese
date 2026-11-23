import { z } from "zod";
import type { Versioned } from "@/lib/sync/state-sync";

/** 서버 상태 문서 키. 세션이 버즈 인증에 읽는다 */
export const TESTS_SYNC_KEY = "ilmunta-tests";

/** 남겨 둘 시험 결과 수(달 구분 없이 최근 것부터) */
export const MAX_RESULTS = 60;

export const testResultSchema = z.object({
  month: z.union([z.literal(4), z.literal(5), z.literal(6)]),
  /** 끝낸 시각(ms) */
  at: z.number(),
  score: z.number().min(0).max(100),
  correct: z.number().int().min(0),
  total: z.number().int().min(0),
  passed: z.boolean(),
  /** 틀린 문제: 물은 것, 정답, 쓴 답 */
  wrong: z.array(
    z.object({ prompt: z.string(), expected: z.string(), given: z.string() }),
  ),
});
export type TestResult = z.infer<typeof testResultSchema>;

export const testsDataSchema = z.object({
  version: z.literal(1),
  updatedAt: z.number(),
  results: z.array(testResultSchema),
});
export type TestsData = z.infer<typeof testsDataSchema>;

export function emptyTestsData(): TestsData {
  return { version: 1, updatedAt: 0, results: [] };
}

export function addResult(data: TestsData, result: TestResult): TestsData {
  return {
    ...data,
    updatedAt: result.at,
    results: [...data.results, result].slice(-MAX_RESULTS),
  };
}

export function bestScore(data: TestsData, month: number): number | null {
  const scores = data.results
    .filter((r) => r.month === month)
    .map((r) => r.score);
  return scores.length > 0 ? Math.max(...scores) : null;
}

export function toVersioned(data: TestsData): Versioned<TestsData> | null {
  if (data.updatedAt === 0) return null;
  return { value: data, updatedAt: data.updatedAt };
}

export function adoptFromServer(
  current: TestsData,
  synced: Versioned<unknown> | null,
): TestsData | null {
  if (!synced || synced.updatedAt <= current.updatedAt) return null;
  const parsed = testsDataSchema.safeParse(synced.value);
  if (!parsed.success) return null;
  return { ...parsed.data, updatedAt: synced.updatedAt };
}
