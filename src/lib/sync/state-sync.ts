// 상태 문서(가나 진도 등)를 서버와 맞춘다. 늦게 고친 쪽이 이긴다.

export interface Versioned<T> {
  value: T;
  updatedAt: number;
}

export type SyncDecision = "push" | "pull" | "same";

export function decideSync(
  local: Versioned<unknown> | null,
  server: Versioned<unknown> | null,
): SyncDecision {
  if (!server && !local) return "same";
  if (!server) return "push";
  if (!local) return "pull";
  if (local.updatedAt > server.updatedAt) return "push";
  if (local.updatedAt < server.updatedAt) return "pull";
  return "same";
}

/** 서버와 맞춘 뒤 써야 할 문서를 돌려준다. 오프라인이면 local을 그대로. */
export async function syncState<T>(
  key: string,
  local: Versioned<T> | null,
  fetchImpl: typeof fetch = fetch,
): Promise<Versioned<T> | null> {
  try {
    const res = await fetchImpl(`/api/state/${key}`);
    if (!res.ok) return local;
    const server = (await res.json()) as Versioned<T> | null;
    const decision = decideSync(local, server);
    if (decision === "pull") return server;
    if (decision === "push" && local) {
      const put = await fetchImpl(`/api/state/${key}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(local),
      });
      if (put.ok) {
        const { current } = (await put.json()) as { current: Versioned<T> };
        return current;
      }
    }
    return local;
  } catch {
    return local;
  }
}
