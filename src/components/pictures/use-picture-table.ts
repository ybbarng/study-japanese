"use client";

import { useEffect, useState } from "react";

// 낱말·장면 그림 표(lib/pictures, 그림 문자 표 포함)는 압축해도 20KB쯤이라 강 화면의 첫 JS에 넣지 않고
// 따로 불러온다. 그림은 화면을 그린 뒤 표가 오면 나타난다. 통신이 끊겨도 나오게
// service-worker-register가 한가할 때 미리 받아 빌드 파일 캐시에 담아 둔다.

type PictureTable = typeof import("@/lib/pictures");

let table: PictureTable | null = null;
let loading: Promise<PictureTable> | null = null;

export function loadPictureTable(): Promise<PictureTable> {
  loading ??= import("@/lib/pictures").then((m) => {
    table = m;
    return m;
  });
  return loading;
}

/** 그림 표. 오기 전에는 null(서버 그림과 처음 그림이 같게, 이미 받아 두었어도 그린 뒤에 채운다) */
export function usePictureTable(): PictureTable | null {
  const [t, setT] = useState<PictureTable | null>(null);
  useEffect(() => {
    if (table) {
      setT(table);
      return;
    }
    let cancelled = false;
    void loadPictureTable().then(
      (m) => {
        if (!cancelled) setT(m);
      },
      () => {
        loading = null; // 받지 못했으면 다음에 다시 시도한다
      },
    );
    return () => {
      cancelled = true;
    };
  }, []);
  return t;
}
