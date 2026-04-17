"use client";

import { AppState } from "@/lib/types";

const STORAGE_KEY = "ai-resume-platform-state";

export function loadState(): AppState {
  if (typeof window === "undefined") {
    return {};
  }
  const raw = window.localStorage.getItem(STORAGE_KEY);
  return raw ? (JSON.parse(raw) as AppState) : {};
}

export function saveState(nextState: AppState) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
}

export function mergeState(partial: Partial<AppState>) {
  const current = loadState();
  const merged = { ...current, ...partial };
  saveState(merged);
  return merged;
}

export function clearState() {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.removeItem(STORAGE_KEY);
}
