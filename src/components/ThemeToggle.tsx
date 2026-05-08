"use client";

import React, {
  useState,
  useCallback,
  useRef,
  useEffect,
  type ReactNode,
  type CSSProperties,
} from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export type Theme = "light" | "dark";

export interface AppBarProps {
  /** Logo to display in the AppBar */
  logo?: ReactNode;
  /** Application name */
  appName?: string;
  /** If provided, renders a search input */
  onSearch?: (query: string) => void;
  /** User avatar image URL or element */
  userAvatar?: ReactNode;
  /** User name to display */
  userName?: string;
}

export interface ThemeToggleProps {
  /** Variant of the top bar. Default: "default" */
  variant?: "default" | "appbar" | "icon";
  /** Content for the app bar when variant is "appbar" */
  appBarProps?: AppBarProps;
  /** Starting theme. Default: "light" */
  defaultTheme?: Theme;
  /** Height of the top bar in px. Default: 44 for default, 60 for appbar */
  barHeight?: number;
  /** Diameter of the icon button in px. Default: 36 */
  buttonSize?: number;
  /** Curtain animation duration in ms. Default: 550 */
  duration?: number;
  /** Called after each theme change completes */
  onThemeChange?: (theme: Theme) => void;
  /** Page content rendered below the bar */
  children?: ReactNode;
}

// ─── Design tokens ────────────────────────────────────────────────────────────
// Adapted for Huggy branding - Blue accent with warm beige/cream

export const TOKENS: Record<Theme, Record<string, string>> = {
  light: {
    // Page
    pageBg:    "#f3ede1",      // Warm beige
    pageText:  "#1a1a2e",      // Deep navy
    pageTextMuted: "#6b7280",  // Gray
    
    // Navigation Bar
    barBg:     "#1a1a2e",      // Dark navy bar (contrast)
    barText:   "#ffffff",      // White text
    barBorder: "rgba(255,255,255,0.07)",
    
    // Toggle Button
    btnBg:     "#f3ede1",      // Beige button
    btnText:   "#1a1a2e",      // Dark text
    btnRing:   "rgba(243,237,225,0.3)",
    
    // Inputs
    inputBg:   "rgba(255,255,255,0.1)",
    inputText: "#ffffff",
    inputBorder: "rgba(255,255,255,0.15)",
    
    // Cards
    cardBg:    "#ffffff",
    cardBorder: "rgba(26,26,46,0.08)",
    cardHover: "rgba(26,26,46,0.04)",
    
    // Accents - Huggy Blue
    accent:    "#2563eb",
    accentText: "#ffffff",
    accentHover: "#3b82f6",
    
    // Buttons
    btnPrimaryBg: "#2563eb",
    btnPrimaryText: "#ffffff",
    btnSecondaryBg: "rgba(26,26,46,0.08)",
    btnSecondaryText: "#1a1a2e",
    
    // Shadows
    shadowAccent: "0 0 20px rgba(37,99,235,0.3)",
    shadowCard: "0 4px 20px rgba(0,0,0,0.08)",
  },
  dark: {
    // Page
    pageBg:    "#0e0e0e",      // Deep black
    pageText:  "#dfd8c6",      // Warm cream
    pageTextMuted: "#9ca3af",  // Gray
    
    // Navigation Bar
    barBg:     "#dfd8c6",      // Cream bar (contrast)
    barText:   "#1a1a2e",      // Dark text
    barBorder: "rgba(0,0,0,0.10)",
    
    // Toggle Button
    btnBg:     "#0e0e0e",      // Dark button
    btnText:   "#dfd8c6",      // Cream text
    btnRing:   "rgba(14,14,14,0.4)",
    
    // Inputs
    inputBg:   "rgba(223,216,198,0.08)",
    inputText: "#1a1a2e",
    inputBorder: "rgba(0,0,0,0.15)",
    
    // Cards
    cardBg:    "rgba(255,255,255,0.03)",
    cardBorder: "rgba(223,216,198,0.10)",
    cardHover: "rgba(255,255,255,0.06)",
    
    // Accents - Huggy Blue (brighter for dark)
    accent:    "#3b82f6",
    accentText: "#ffffff",
    accentHover: "#60a5fa",
    
    // Buttons
    btnPrimaryBg: "#3b82f6",
    btnPrimaryText: "#ffffff",
    btnSecondaryBg: "rgba(223,216,198,0.08)",
    btnSecondaryText: "#dfd8c6",
    
    // Shadows
    shadowAccent: "0 0 20px rgba(59,130,246,0.4)",
    shadowCard: "0 4px 20px rgba(0,0,0,0.3)",
  },
};

// ─── Hook for using theme ─────────────────────────────────────────────────────

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('huggy-theme') as Theme | null;
      return saved || 'dark';
    }
    return 'dark';
  });

  useEffect(() => {
    const root = document.documentElement;
    const tokens = TOKENS[theme];
    
    // Apply all tokens as CSS variables
    Object.entries(tokens).forEach(([key, value]) => {
      root.style.setProperty(`--${key}`, value);
    });
    
    // Update class
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    
    localStorage.setItem('huggy-theme', theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  }, []);

  return { theme, setTheme, toggleTheme, tokens: TOKENS[theme] };
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function MoonIcon() {
  return (
    <svg
      width="15" height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg
      width="15" height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="4" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"></circle>
      <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
    </svg>
  );
}

function UserIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
      <circle cx="12" cy="7" r="4"></circle>
    </svg>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

type CurtainPhase = "idle" | "falling" | "rising";

const EASING = "cubic-bezier(0.76, 0, 0.24, 1)";

export function ThemeToggle({
  variant      = "default",
  appBarProps,
  defaultTheme = "light",
  barHeight: explicitBarHeight,
  buttonSize   = 36,
  duration     = 550,
  onThemeChange,
  children,
}: ThemeToggleProps) {
  const isAppBar = variant === "appbar";
  const isIcon = variant === "icon";
  const barHeight = explicitBarHeight ?? (isAppBar ? 60 : 44);

  const [theme, setTheme]     = useState<Theme>(defaultTheme);
  const [phase, setPhase]     = useState<CurtainPhase>("idle");
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);
  const curtainColorRef       = useRef<string>("");
  const t                     = TOKENS[theme];

  // Sync with global on mount
  useEffect(() => {
    if (typeof document !== "undefined") {
      const isDark = document.documentElement.classList.contains("dark");
      if (isDark && theme !== "dark") {
        setTheme("dark");
      } else if (!isDark && theme !== "light") {
        setTheme("light");
      }
    }
  }, []);

  const toggle = useCallback(() => {
    if (phase !== "idle") return;
    const next: Theme = theme === "light" ? "dark" : "light";
    curtainColorRef.current = TOKENS[next].pageBg;
    setPhase("falling");

    setTimeout(() => {
      setTheme(next);
      onThemeChange?.(next);
      
      if (typeof document !== "undefined") {
        const root = document.documentElement;
        const tokens = TOKENS[next];
        
        // Apply all tokens as CSS variables
        Object.entries(tokens).forEach(([key, value]) => {
          root.style.setProperty(`--${key}`, value);
        });
        
        if (next === "dark") {
          root.classList.add("dark");
        } else {
          root.classList.remove("dark");
        }
      }

      setPhase("rising");
      setTimeout(() => setPhase("idle"), duration + 60);
    }, duration);
  }, [phase, theme, duration, onThemeChange]);

  // ── Derived styles ──────────────────────────────────────────────────────────

  const pageStyle: CSSProperties = {
    minHeight: "100vh",
    paddingTop: barHeight,
    background: t.pageBg,
    color: t.pageText,
    transition: "background 0.3s ease, color 0.3s ease",
  };

  const barStyle: CSSProperties = {
    position: "fixed",
    top: 0, left: 0, right: 0,
    height: barHeight,
    background: t.barBg,
    color: t.barText,
    borderBottom: `1px solid ${t.barBorder}`,
    overflow: "visible",
    zIndex: 9998,
    transition: "background 0.3s ease, border-color 0.3s ease, color 0.3s ease",
    display: isAppBar ? "flex" : "block",
    alignItems: "center",
    justifyContent: "space-between",
    padding: isAppBar ? "0 24px" : "0",
    fontFamily: "system-ui, -apple-system, sans-serif",
  };

  const btnScale = pressed ? 0.96 : hovered ? 1.1 : 1;
  const btnStyle: CSSProperties = {
    position: isAppBar || isIcon ? "relative" : "absolute",
    bottom: isAppBar || isIcon ? "auto" : -(buttonSize / 2),
    left: isAppBar || isIcon ? "auto" : "50%",
    transform: isAppBar || isIcon ? `scale(${btnScale})` : `translateX(-50%) scale(${btnScale})`,
    width: buttonSize,
    height: buttonSize,
    borderRadius: "50%",
    border: "none",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: t.btnBg,
    color: t.btnText,
    boxShadow: `0 0 0 1.5px ${t.btnRing}`,
    zIndex: 9999,
    outline: "none",
    transition: "background 0.3s ease, color 0.3s ease, transform 0.15s ease, box-shadow 0.3s ease",
    marginLeft: isAppBar ? "16px" : "0",
    flexShrink: 0,
  };

  const curtainStyle: CSSProperties = {
    position: "fixed",
    inset: 0,
    background: curtainColorRef.current,
    transformOrigin: "top",
    transform: phase === "falling" ? "scaleY(1)" : "scaleY(0)",
    transition: phase !== "idle" ? `transform ${duration}ms ${EASING}` : undefined,
    zIndex: 9997,
    pointerEvents: "none",
  };

  const appBarSectionStyle: CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  };

  if (isIcon) {
    return (
      <>
        <div aria-hidden="true" style={curtainStyle} />
        <button
          style={btnStyle}
          onClick={toggle}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => { setHovered(false); setPressed(false); }}
          onMouseDown={() => setPressed(true)}
          onMouseUp={() => setPressed(false)}
          aria-label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
          aria-pressed={theme === "dark"}
        >
          {theme === "light" ? <MoonIcon /> : <SunIcon />}
        </button>
      </>
    );
  }

  return (
    <div style={pageStyle}>
      {/* Curtain overlay */}
      <div aria-hidden="true" style={curtainStyle} />

      {/* Fixed top bar */}
      <div style={barStyle}>
        
        {isAppBar && (
          <div style={{ ...appBarSectionStyle, flex: 1 }}>
            {appBarProps?.logo && (
              <div style={{ display: "flex", alignItems: "center" }}>
                {appBarProps.logo}
              </div>
            )}
            {appBarProps?.appName && (
              <span style={{ fontWeight: 600, fontSize: "1.1rem", letterSpacing: "-0.01em" }}>
                {appBarProps.appName}
              </span>
            )}
          </div>
        )}

        {isAppBar && appBarProps?.onSearch && (
          <div style={{ ...appBarSectionStyle, flex: 1, justifyContent: "center" }}>
            <div style={{ 
              position: "relative", 
              width: "100%", 
              maxWidth: "320px",
              display: "flex",
              alignItems: "center"
            }}>
              <div style={{ position: "absolute", left: "12px", display: "flex", opacity: 0.6 }}>
                <SearchIcon />
              </div>
              <input 
                type="text" 
                placeholder="Search..."
                onChange={(e) => appBarProps.onSearch?.(e.target.value)}
                style={{
                  width: "100%",
                  height: "36px",
                  padding: "0 16px 0 36px",
                  borderRadius: "18px",
                  border: "none",
                  outline: "none",
                  background: t.inputBg,
                  color: t.inputText,
                  fontSize: "0.9rem",
                  transition: "background 0.3s ease, color 0.3s ease",
                }}
              />
            </div>
          </div>
        )}

        {isAppBar && (
          <div style={{ ...appBarSectionStyle, flex: 1, justifyContent: "flex-end" }}>
            {appBarProps?.userName && (
              <span style={{ fontSize: "0.9rem", opacity: 0.9 }}>
                {appBarProps.userName}
              </span>
            )}
            {appBarProps?.userAvatar !== undefined ? (
              appBarProps.userAvatar
            ) : (
              <div style={{
                width: "32px",
                height: "32px",
                borderRadius: "50%",
                background: t.inputBg,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: t.inputText,
              }}>
                <UserIcon />
              </div>
            )}
            
            {/* Toggle Button in AppBar */}
            <button
              style={btnStyle}
              onClick={toggle}
              onMouseEnter={() => setHovered(true)}
              onMouseLeave={() => { setHovered(false); setPressed(false); }}
              onMouseDown={() => setPressed(true)}
              onMouseUp={() => setPressed(false)}
              aria-label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
              aria-pressed={theme === "dark"}
            >
              {theme === "light" ? <MoonIcon /> : <SunIcon />}
            </button>
          </div>
        )}

        {!isAppBar && (
          // Default layout: just the button hanging out
          <button
            style={btnStyle}
            onClick={toggle}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => { setHovered(false); setPressed(false); }}
            onMouseDown={() => setPressed(true)}
            onMouseUp={() => setPressed(false)}
            aria-label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
            aria-pressed={theme === "dark"}
          >
            {theme === "light" ? <MoonIcon /> : <SunIcon />}
          </button>
        )}

      </div>

      {/* Page content */}
      {children}
    </div>
  );
}

export default ThemeToggle;
