export const loadState = (key: string) => {
  if (typeof window === "undefined") return null;
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
};

export const mergeState = (key: string, value: any) => {
  if (typeof window === "undefined") return;
  try {
    const existing = loadState(key) || {};
    localStorage.setItem(key, JSON.stringify({ ...existing, ...value }));
  } catch {}
};

export const saveState = (key: string, value: any) => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
};

export const clearState = (key: string) => {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(key);
  } catch {}
};

export const APP_STATE_KEY = "ai-resume-platform-state";

