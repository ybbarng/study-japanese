import Link from "next/link";

/**
 * 계정 자리: 로그인하지 않았으면 로그인(기록 저장은 로그인한 사람만), 로그인했으면 설정.
 * 로그인 여부를 아직 모르면 아무것도 그리지 않는다(깜빡임 대신 빈자리).
 */
export function AccountLink({ isAdmin }: { isAdmin?: boolean }) {
  if (isAdmin === undefined) return null;
  if (isAdmin)
    return (
      <Link
        href="/settings"
        className="rounded-xl px-3 py-2 text-sm text-ink-soft hover:bg-bg-raised"
      >
        설정
      </Link>
    );
  return (
    <Link href="/login" className="rounded-xl px-3 py-2 hover:bg-bg-raised">
      <span className="block text-sm font-medium">로그인</span>
      <span className="block text-xs text-ink-faint">기록 저장은 로그인</span>
    </Link>
  );
}
