import { useCallback, useSyncExternalStore } from "react";

const STORAGE_KEY = "sidebar.collapsed";

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

function getSnapshot() {
  return window.localStorage.getItem(STORAGE_KEY) === "1";
}

function getServerSnapshot() {
  return false;
}

export function useSidebarState() {
  const collapsed = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  const setCollapsed = useCallback((next: boolean) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEY }));
    } catch {
      // ignore (private mode, etc.)
    }
  }, []);

  const toggle = useCallback(() => {
    setCollapsed(!collapsed);
  }, [collapsed, setCollapsed]);

  return { collapsed, setCollapsed, toggle };
}
