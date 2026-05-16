import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "sidebar.collapsed";

export function useSidebarState() {
  const [collapsed, setCollapsedState] = useState(false);

  useEffect(() => {
    const read = () => {
      try {
        setCollapsedState(window.localStorage.getItem(STORAGE_KEY) === "1");
      } catch {
        // ignore (private mode, etc.)
      }
    };
    read();
    window.addEventListener("storage", read);
    return () => window.removeEventListener("storage", read);
  }, []);

  const setCollapsed = useCallback((next: boolean) => {
    setCollapsedState(next);
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
