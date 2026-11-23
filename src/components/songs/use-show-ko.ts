"use client";

import { useEffect, useState } from "react";

// 가사 학습 화면의 "해석 모두 보기"를 이 브라우저에 기억한다. 기본은 가려 둔다.
// 저장소를 쓸 수 없는 브라우저(사생활 보호 창 등)에서도 화면은 그대로 돈다.

const KEY = "sj-songs-show-ko";

export function useShowKo(): [boolean, (on: boolean) => void] {
  const [on, setOn] = useState(false);
  useEffect(() => {
    try {
      setOn(window.localStorage.getItem(KEY) === "1");
    } catch {
      // 읽지 못하면 가려 둔 채로
    }
  }, []);
  const set = (next: boolean) => {
    setOn(next);
    try {
      window.localStorage.setItem(KEY, next ? "1" : "0");
    } catch {
      // 기억하지 못해도 이번 화면에서는 켜진다
    }
  };
  return [on, set];
}
