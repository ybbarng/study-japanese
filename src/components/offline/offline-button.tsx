"use client";

import Link from "next/link";
import {
  cancelDownload,
  queueDownload,
  removePack,
} from "@/lib/offline/manager";
import type { OfflinePack } from "@/lib/offline/pack";
import { formatBytes } from "@/lib/offline/size";
import type { Job } from "@/lib/offline/store";
import { AutoPrefetch } from "./auto-prefetch";
import { usePackStatus } from "./use-pack-status";

/**
 * 강 화면의 "이 강 받아 두기". 강의·예문 mp3와 강 화면을 폰에 받아 두어
 * 지하철·터널에서 통신이 끊겨도 듣게 한다.
 */
export function OfflineButton({
  pack,
  className,
}: {
  pack: OfflinePack;
  className?: string;
}) {
  const view = usePackStatus(pack);
  if (view.kind === "unsupported" || view.kind === "checking")
    return <AutoPrefetch />;

  return (
    <section
      aria-label="이 강 받아 두기"
      className={`rounded-2xl border border-line px-4 py-3 ${className ?? ""}`}
    >
      <AutoPrefetch />
      {view.kind === "none" ? (
        <Row
          title="이 강 받아 두기"
          note={`통신이 끊겨도 듣게 강의·예문 ${pack.audioUrls.length}개를 폰에 받아 둡니다`}
          action={
            <Action onClick={() => queueDownload(pack)} primary>
              받기
            </Action>
          }
        />
      ) : null}

      {view.kind === "job" ? <JobRow pack={pack} job={view.job} /> : null}

      {view.kind === "partial" ? (
        <Row
          title={`일부만 받음 · ${view.seen.present}/${view.seen.total}`}
          note={`${formatBytes(view.seen.bytes)} 받아 둠. 남은 파일을 이어 받습니다`}
          action={
            <>
              <Action onClick={() => void removePack(pack.id)}>지우기</Action>
              <Action onClick={() => queueDownload(pack)} primary>
                이어 받기
              </Action>
            </>
          }
        />
      ) : null}

      {view.kind === "done" ? (
        <Row
          title={`받아 둠 · ${formatBytes(view.seen.bytes)}`}
          titleClass="text-good"
          note={
            <Link href="/offline" className="underline underline-offset-2">
              받아 둔 강 보기
            </Link>
          }
          action={
            <Action onClick={() => void removePack(pack.id)}>지우기</Action>
          }
        />
      ) : null}
    </section>
  );
}

function JobRow({ pack, job }: { pack: OfflinePack; job: Job }) {
  const { done, total, bytes } = job.progress;
  if (job.phase === "error")
    return (
      <Row
        title={`받다가 멈춤 · ${done}/${total}`}
        titleClass="text-accent"
        note={job.message}
        action={
          <Action onClick={() => queueDownload(pack)} primary>
            이어 받기
          </Action>
        }
      />
    );
  const ratio = total > 0 ? done / total : 0;
  return (
    <div>
      <Row
        title={
          job.phase === "queued"
            ? "받을 차례를 기다리는 중"
            : `받는 중 · ${done}/${total} · ${formatBytes(bytes)}`
        }
        note="다른 화면으로 옮겨도 계속 받습니다(앱을 닫으면 멈추고, 다시 누르면 이어 받습니다)"
        action={<Action onClick={() => cancelDownload(pack.id)}>취소</Action>}
      />
      <div
        role="progressbar"
        aria-label="받은 정도"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={done}
        className="mt-2 h-1.5 overflow-hidden rounded-full bg-bg-sunken"
      >
        <div
          className="h-full rounded-full bg-accent transition-[width]"
          style={{ width: `${Math.round(ratio * 100)}%` }}
        />
      </div>
    </div>
  );
}

function Row({
  title,
  titleClass,
  note,
  action,
}: {
  title: string;
  titleClass?: string;
  note?: React.ReactNode;
  action: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="min-w-0 flex-1">
        <p className={titleClass ?? "font-medium"}>{title}</p>
        {note ? <p className="text-xs text-ink-faint">{note}</p> : null}
      </div>
      <div className="flex shrink-0 gap-2">{action}</div>
    </div>
  );
}

function Action({
  onClick,
  primary,
  children,
}: {
  onClick: () => void;
  primary?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        primary
          ? "rounded-full bg-accent px-4 py-2 text-sm font-bold text-white"
          : "rounded-full border border-line px-3 py-2 text-sm text-ink-soft"
      }
    >
      {children}
    </button>
  );
}
