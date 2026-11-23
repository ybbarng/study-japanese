import Link from "next/link";
import { LESSONS } from "@/lib/kana/lessons";
import { BookLinks } from "./book-links";
import { Tools } from "./tools";

interface Props {
  daysLeft: number;
  /** 일무따 0강 강의 길이(초). 교재가 없으면 null */
  lesson0Sec: number | null;
}

const FIRST_KANA = LESSONS[0];

/** 2027년 1월 1일 전: 무엇을 하게 될지 미리 보고, 준비만 해 둔다(미리 시작은 권하지 않는다) */
export function BeforeStart({ daysLeft, lesson0Sec }: Props) {
  return (
    <>
      <section>
        <p className="text-6xl font-bold tracking-tight text-accent">
          D-{daysLeft}
        </p>
        <p className="mt-2 text-lg">2027년 1월 1일에 시작합니다</p>
        <p className="mt-1 text-sm text-ink-soft">
          그날 아침 이 화면을 열면 맨 위에 “0강 듣기”가 놓여 있어요.
        </p>
      </section>

      <section aria-label="첫날 할 것">
        <h2 className="pb-2 text-sm text-ink-faint">첫날 할 것 미리 보기</h2>
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-2xl bg-bg-raised p-4">
            <span className="text-xs text-accent">일무따 0강</span>
            <span className="mt-1 block font-medium">오리엔테이션</span>
            <span className="mt-1 block text-xs text-ink-soft">
              걸으며 듣기
              {lesson0Sec ? ` · ${Math.round(lesson0Sec / 60)}분` : ""}
            </span>
          </div>
          <div className="rounded-2xl bg-bg-raised p-4">
            <span className="text-xs text-accent">가나 첫 레슨</span>
            <span lang="ja" className="mt-1 block font-ja-serif font-medium">
              {FIRST_KANA.glyphs}
            </span>
            <span className="mt-1 block text-xs text-ink-soft">
              며칠 안에 익히고 바로 읽기
            </span>
          </div>
        </div>
      </section>

      <section aria-label="준비해 둘 것">
        <h2 className="pb-2 text-sm text-ink-faint">그 전에 준비해 둘 것</h2>
        <ol className="space-y-2">
          <li className="rounded-2xl bg-bg-raised p-4">
            <p className="font-medium">1. 폰 홈 화면에 설치</p>
            <p className="mt-1 text-sm text-ink-soft">
              안드로이드 Chrome에서 오른쪽 위 ⋮ → “홈 화면에 추가”(또는 “앱
              설치”)를 누르면 앱처럼 열리고, 잠금 화면에서 재생을 조작할 수
              있어요.
            </p>
          </li>
          <li className="rounded-2xl bg-bg-raised p-4">
            <p className="font-medium">2. 일본어 입력기 켜기</p>
            <p className="mt-1 text-sm text-ink-soft">
              주말에 문장을 쓸 때 필요해요.{" "}
              <Link
                href="/ime"
                className="text-accent underline underline-offset-4"
              >
                켜는 방법 보기
              </Link>
            </p>
          </li>
          <li className="rounded-2xl bg-bg-raised p-4">
            <p className="font-medium">3. 첫 주에 들을 강 받아 두기</p>
            <p className="mt-1 text-sm text-ink-soft">
              받아 두면 데이터 없이도 걸으며 들을 수 있어요.{" "}
              <Link
                href="/offline"
                className="text-accent underline underline-offset-4"
              >
                받아 둔 강 보기
              </Link>
            </p>
          </li>
        </ol>
      </section>

      <BookLinks title="미리 둘러보기 (시작은 1월 1일에)" />
      <Tools />
    </>
  );
}
