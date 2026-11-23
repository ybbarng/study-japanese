import { notFound } from "next/navigation";
import { SongStudy } from "@/components/songs/song-study";
import { isSlug } from "@/lib/songs/schema";
import { loadSongPage } from "@/lib/songs/server-data";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const data = isSlug(slug) ? await loadSongPage(slug) : null;
  return { title: `${data ? data.song.title : "노래"} — にほんご` };
}

export default async function SongPage({ params }: Props) {
  const { slug } = await params;
  if (!isSlug(slug)) notFound();
  const data = await loadSongPage(slug);
  if (!data) notFound();
  return (
    <SongStudy
      key={data.song.updatedAt}
      song={data.song}
      isAdmin={data.isAdmin}
      learned={data.learned}
      analysis={data.analysis}
      analysisBroken={data.analysisBroken}
    />
  );
}
