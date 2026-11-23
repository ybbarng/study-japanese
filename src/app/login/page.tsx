import { safeNextPath } from "@/lib/auth/safe-next";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6">
      <p
        lang="ja"
        className="font-[family-name:var(--font-jp-serif)] text-6xl font-bold tracking-widest text-ink"
      >
        ようこそ
      </p>
      <p className="mt-3 text-ink-soft">일본어 학습 공간</p>
      <form
        method="post"
        action="/api/login"
        className="mt-12 flex w-full max-w-xs flex-col gap-3"
      >
        <input type="hidden" name="next" value={safeNextPath(next ?? "/")} />
        <label className="sr-only" htmlFor="password">
          암호
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          placeholder="암호"
          className="h-14 rounded-2xl border border-line bg-bg-raised px-5 text-lg text-ink outline-none placeholder:text-ink-faint focus:border-accent"
        />
        {error ? (
          <p className="text-sm text-accent">암호가 맞지 않습니다.</p>
        ) : null}
        <button
          type="submit"
          className="h-14 rounded-2xl bg-accent text-lg font-medium text-white active:opacity-80"
        >
          들어가기
        </button>
      </form>
    </main>
  );
}
