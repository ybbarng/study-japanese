import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-6 pt-[max(env(safe-area-inset-top),3rem)]">
      <p lang="ja" className="font-ja-serif text-5xl font-bold tracking-widest">
        にほんご
      </p>
      <p className="mt-2 text-ink-soft">2027년 1월 1일에 시작합니다.</p>
      <nav className="mt-12 flex flex-col gap-3">
        <Link href="/kana" className="rounded-2xl bg-accent p-5 text-white">
          <span lang="ja" className="block text-lg font-bold">
            かな
          </span>
          <span className="text-sm opacity-80">
            히라가나·가타카나: 소리·알아보기·쓰기·낱말 읽기
          </span>
        </Link>
        <Link href="/lab/player" className="rounded-2xl bg-bg-raised p-5">
          <span className="block text-lg font-medium">재생 시험</span>
          <span className="text-sm text-ink-soft">
            잠금 화면 조작·화면 끈 채 재생 확인
          </span>
        </Link>
      </nav>
    </main>
  );
}
