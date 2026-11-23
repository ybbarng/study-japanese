import Link from "next/link";

/** 서버에 교재 JSON(CONTENT_DIR/textbook/ilmuta.json)이 없을 때 */
export function NoTextbook() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6">
      <p className="text-2xl font-bold">교재 데이터가 없습니다</p>
      <p className="mt-3 text-ink-soft">
        서버의 교재 폴더에 <code>textbook/ilmuta.json</code>을 두면 열립니다.
      </p>
      <Link href="/" className="mt-8 text-accent">
        처음으로
      </Link>
    </main>
  );
}
