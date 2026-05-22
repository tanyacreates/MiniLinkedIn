"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";

export function ThemeToggle({ className = "" }) {
  const { theme, toggleTheme, mounted } = useTheme();

  // Avoid hydration mismatch — render a placeholder until mounted
  if (!mounted) {
    return (
      <button
        aria-label="Toggle theme"
        className={`inline-flex items-center justify-center h-9 w-9 rounded-md border border-gray-200 dark:border-gray-700 ${className}`}
      >
        <Sun className="h-4 w-4" />
      </button>
    );
  }

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className={`inline-flex items-center justify-center h-9 w-9 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${className}`}
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}

export default ThemeToggle;
