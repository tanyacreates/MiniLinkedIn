"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

const ThemeContext = createContext({
  theme: "light",
  setTheme: () => {},
  toggleTheme: () => {},
});

const STORAGE_KEY = "mini-linkedin-theme";

function applyThemeClass(theme) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (theme === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
}

export function ThemeProvider({ children, defaultTheme = "light" }) {
  const [theme, setThemeState] = useState(defaultTheme);
  const [mounted, setMounted] = useState(false);

  // On mount, read from localStorage or system preference
  useEffect(() => {
    let initial = defaultTheme;
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved === "dark" || saved === "light") {
        initial = saved;
      } else if (
        window.matchMedia &&
        window.matchMedia("(prefers-color-scheme: dark)").matches
      ) {
        initial = "dark";
      }
    } catch (e) {
      // ignore storage errors
    }
    setThemeState(initial);
    applyThemeClass(initial);
    setMounted(true);
  }, [defaultTheme]);

  const setTheme = useCallback((next) => {
    setThemeState(next);
    applyThemeClass(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch (e) {
      // ignore storage errors
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark");
  }, [theme, setTheme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme, mounted }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
