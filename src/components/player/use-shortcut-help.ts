"use client";

import { create } from "zustand";

// 단축키 도움말 창이 열려 있는지. ? 키(재생기)와 탐색·재생 막대의 단추가 함께 연다.
export const useShortcutHelp = create<{
  open: boolean;
  setOpen: (open: boolean) => void;
}>()((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
}));
