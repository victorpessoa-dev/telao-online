"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

const SIDEBAR_STORAGE_KEY = "vplaycast:admin-sidebar-collapsed";
const AdminSidebarStateContext = createContext(null);

export function AdminSidebarStateProvider({ children }) {
  const [collapsed, setCollapsed] = useState(true);

  useEffect(() => {
    const syncCollapsed = () => {
      if (window.innerWidth < 1280) {
        setCollapsed(true);
        return;
      }

      setCollapsed(localStorage.getItem(SIDEBAR_STORAGE_KEY) === "true");
    };

    syncCollapsed();
    window.addEventListener("resize", syncCollapsed);
    return () => window.removeEventListener("resize", syncCollapsed);
  }, []);

  const updateCollapsed = useCallback((value) => {
    setCollapsed(value);
    localStorage.setItem(SIDEBAR_STORAGE_KEY, String(value));
    window.dispatchEvent(new CustomEvent("vplaycast_sidebar_resize"));
  }, []);

  return (
    <AdminSidebarStateContext.Provider value={{ collapsed, updateCollapsed }}>
      {children}
    </AdminSidebarStateContext.Provider>
  );
}

export function useAdminSidebarState() {
  const state = useContext(AdminSidebarStateContext);

  if (!state) {
    throw new Error(
      "useAdminSidebarState deve ser usado dentro de AdminSidebarStateProvider.",
    );
  }

  return state;
}
