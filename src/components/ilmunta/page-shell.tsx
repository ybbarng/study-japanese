import Link from "next/link";
import type { ReactNode } from "react";

/** 일문따 화면 한 장: 위에 돌아가기·제목, 아래 내용 */
export function PageShell({
  back,
  backLabel,
  title,
  right,
  children,
}: {
  back: string;
  backLabel: string;
  title?: string;
  right?: ReactNode;
  children: ReactNode;
}) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-6 px-5 pt-[max(env(safe-area-inset-top),1.25rem)] pb-32">
      <header className="flex items-center justify-between gap-3">
        <Link href={back} className="text-sm text-ink-faint">
          ← {backLabel}
        </Link>
        {title ? (
          <h1 className="truncate text-sm text-ink-soft">{title}</h1>
        ) : null}
        {right ?? <span />}
      </header>
      {children}
    </main>
  );
}

/** 교재 JSON이 서버에 없을 때 */
export function NoIlmunta() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6">
      <p className="text-2xl font-bold">교재 데이터가 없습니다</p>
      <p className="mt-3 text-ink-soft">
        서버의 교재 폴더에 <code>textbook/ilmunta.json</code>을 두면 열립니다.
        활용 드릴은 교재 없이도 됩니다.
      </p>
      <Link href="/ilmunta/drill" className="mt-8 text-accent">
        활용 드릴 하기
      </Link>
      <Link href="/" className="mt-3 text-ink-soft">
        처음으로
      </Link>
    </main>
  );
}
