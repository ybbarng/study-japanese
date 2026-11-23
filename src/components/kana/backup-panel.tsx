"use client";

import { useState } from "react";
import { exportKanaState, importKanaState } from "@/lib/kana/store";

/** 기록을 JSON으로 꺼내거나 들여온다(기기 바꿀 때·서버 동기화 전 백업용). */
export function BackupPanel() {
  const [text, setText] = useState("");
  const [msg, setMsg] = useState("");

  return (
    <details className="rounded-2xl bg-bg-sunken p-4 text-sm">
      <summary className="cursor-pointer text-ink-faint">
        기록 내보내기·들여오기
      </summary>
      <div className="mt-3 flex flex-col gap-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          className="w-full rounded-lg bg-bg-raised p-2 font-mono text-xs text-ink-soft"
          aria-label="기록 JSON"
        />
        <div className="flex gap-2">
          <button
            type="button"
            className="flex-1 rounded-lg bg-bg-raised py-2"
            onClick={async () => {
              const json = exportKanaState();
              setText(json);
              try {
                await navigator.clipboard.writeText(json);
                setMsg("복사했어요");
              } catch {
                setMsg("위 칸의 글을 복사해 두세요");
              }
            }}
          >
            내보내기
          </button>
          <button
            type="button"
            className="flex-1 rounded-lg bg-bg-raised py-2"
            onClick={() => {
              try {
                importKanaState(text);
                setMsg("들여왔어요");
              } catch {
                setMsg("기록 모양이 맞지 않아요");
              }
            }}
          >
            들여오기
          </button>
        </div>
        {msg && <p className="text-ink-soft">{msg}</p>}
      </div>
    </details>
  );
}
