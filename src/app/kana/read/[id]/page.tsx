import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { BridgeReader } from "@/components/kana/bridge-reader";
import { Hydrated } from "@/components/kana/hydrated";
import { BRIDGE_BY_ID } from "@/lib/bridge/bridges";
import { pickForBridge } from "@/lib/bridge/pick";
import { loadIlmuta } from "@/lib/textbook/load";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const bridge = BRIDGE_BY_ID.get((await params).id);
  return { title: bridge ? `${bridge.title} · かな` : "かな" };
}

/** 가나 → 일무따 다리 레슨. 교재 문장은 git 밖이라 요청 때 서버에서 읽어 고른다 */
export default async function BridgePage({ params }: Props) {
  const bridge = BRIDGE_BY_ID.get((await params).id);
  if (!bridge) notFound();
  await connection();
  const book = loadIlmuta();
  const sentences = book ? pickForBridge(book.lessons, bridge) : [];
  return (
    <Hydrated>
      <BridgeReader bridge={bridge} sentences={sentences} />
    </Hydrated>
  );
}
