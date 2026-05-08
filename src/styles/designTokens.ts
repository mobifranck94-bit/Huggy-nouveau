// Design Tokens for Huggy SaaS
// Centralized color system based on the ThemeToggle palette

import { TOKENS as ThemeTokens, type Theme } from "../components/ThemeToggle";

// Re-export for convenience
export { TOKENS as TOKENS } from "../components/ThemeToggle";
export type { Theme } from "../components/ThemeToggle";

// Helper function to apply theme to document
export function applyThemeToDocument(theme: Theme) {
  const root = document.documentElement;
  const tokens = ThemeTokens[theme];
  
  // Apply all tokens as CSS variables
  Object.entries(tokens).forEach(([key, value]) => {
    root.style.setProperty(`--${key}`, value);
  });
  
  // Update class
  if (theme === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
  
  // Save preference
  localStorage.setItem("huggy-theme", theme);
}

// Initialize theme on app start
export function initTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  
  const saved = localStorage.getItem("huggy-theme") as Theme | null;
  const theme = saved || "dark";
  
  applyThemeToDocument(theme);
  return theme;
}

// Color palette reference (for manual usage)
export const PALETTE = {
  // Primary - Huggy Blue
  blue: {
    50: "#eff6ff",
    100: "#dbeafe",
    200: "#bfdbfe",
    300: "#93c5fd",
    400: "#60a5fa",
    500: "#3b82f6",
    600: "#2563eb",
    700: "#1d4ed8",
    800: "#1e40af",
    900: "#1e3a8a",
  },
  
  // Light mode - Warm beige/cream
  light: {
    bg: "#f3ede1",
    text: "#1a1a2e",
    muted: "#6b7280",
    card: "#ffffff",
    border: "rgba(26,26,46,0.08)",
  },
  
  // Dark mode - Deep black
  dark: {
    bg: "#0e0e0e",
    text: "#dfd8c6",
    muted: "#9ca3af",
    card: "rgba(255,255,255,0.03)",
    border: "rgba(223,216,198,0.10)",
  },
};

// Usage example in components:
// <div style={{ backgroundColor: 'var(--pageBg)', color: 'var(--pageText)' }}>
// or with Tailwind: className="bg-[var(--pageBg)] text-[var(--pageText)]"
