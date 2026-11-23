"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { queueDownload, removePack } from "@/lib/offline/manager";
import { BOOK_LABEL, type OfflinePack } from "@/lib/offline/pack";
import { formatBytes } from "@/lib/offline/size";
import { type SavedPack, useOffline } from "@/lib/offline/store";
import { usePackStatus } from "./use-pack-status";

/** 받아 둔 강 목록. 목록은 폰(localStorage)에 있어 그린 뒤에 채운다 */
export function SavedList() {
  const packs = useOffline((s) => s.packs);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const list = Object.values(packs).sort(byBookAndNo);
  if (list.length === 0)
    return (
      <p className="rounded-2xl bg-bg-raised px-4 py-6 text-center text-ink-soft">
        아직 받아 둔 강이 없습니다. 강 화면의 "이 강 받아 두기"를 눌러 보세요.
      </p>
    );

  return (
    <ul className="overflow-hidden rounded-2xl bg-bg-raised">
      {list.map((p) => (
        <li key={p.pack.id} className="border-b border-line last:border-b-0">
          <SavedRow pack={p.pack} />
        </li>
      ))}
    </ul>
  );
}

function byBookAndNo(a: SavedPack, b: SavedPack): number {
  if (a.pack.book !== b.pack.book) return a.pack.book === "ilmuta" ? -1 : 1;
  return a.pack.no - b.pack.no;
}

function SavedRow({ pack }: { pack: OfflinePack }) {
  const view = usePackStatus(pack);
  let status: string;
  let resumable = false;
  switch (view.kind) {
    case "done":
      status = formatBytes(view.seen.bytes);
      break;
    case "partial":
      status = `일부만 · ${view.seen.present}/${view.seen.total} · ${formatBytes(view.seen.bytes)}`;
      resumable = true;
      break;
    case "none":
      status = "브라우저가 지움";
      resumable = true;
      break;
    case "job":
      status =
        view.job.phase === "error"
          ? (view.job.message ?? "받다가 멈춤")
          : `받는 중 · ${view.job.progress.done}/${view.job.progress.total}`;
      resumable = view.job.phase === "error";
      break;
    default:
      status = "…";
  }

  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <Link href={pack.pageUrl} className="min-w-0 flex-1">
        <span className="block truncate">
          <span className="text-sm text-accent">{BOOK_LABEL[pack.book]}</span>{" "}
          <span lang="ja">{pack.title}</span>
        </span>
        <span className="text-sm text-ink-soft">{status}</span>
      </Link>
      {resumable ? (
        <button
          type="button"
          onClick={() => queueDownload(pack)}
          className="shrink-0 rounded-full bg-accent px-3 py-2 text-sm font-bold text-white"
        >
          이어 받기
        </button>
      ) : null}
      <button
        type="button"
        onClick={() => void removePack(pack.id)}
        aria-label={`${pack.title} 지우기`}
        className="shrink-0 rounded-full border border-line px-3 py-2 text-sm text-ink-soft"
      >
        지우기
      </button>
    </div>
  );
}
