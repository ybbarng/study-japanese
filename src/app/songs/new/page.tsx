import Link from "next/link";
import { PageFrame } from "@/components/shell/page-frame";
import { SongForm } from "@/components/songs/song-form";
import { AUDIO_FILE_PATTERN } from "@/lib/songs/schema";

export const metadata = { title: "노래 넣기 — にほんご" };

// 관리자만(proxy.ts가 로그인 화면으로 보낸다).
// 노래 목록의 "서버에 있는 음원"에서 오면 ?file=<파일 이름>으로 파일·주소 이름을 채운다.
export default async function NewSongPage({
  searchParams,
}: {
  searchParams: Promise<{ file?: string | string[] }>;
}) {
  const { file } = await searchParams;
  const initialFile =
    typeof file === "string" && AUDIO_FILE_PATTERN.test(file)
      ? file
      : undefined;
  return (
    <PageFrame className="pb-16">
      <Link href="/songs" className="text-sm text-ink-faint">
        ← 노래 목록
      </Link>
      <h1 className="mt-3 mb-6 text-2xl font-bold">노래 넣기</h1>
      <SongForm initialFile={initialFile} />
    </PageFrame>
  );
}
