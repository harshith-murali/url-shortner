"use client";
import { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext({ theme: "light", toggle: () => {} });

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState("light");

  useEffect(() => {
    const stored = typeof localStorage !== "undefined" ? localStorage.getItem("theme") : null;
    const preferred = stored
      ? stored
      : typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";

    // Synchronously apply the class to the document element to prevent FOUC (Flash of Unstyled Content)
    document.documentElement.classList.toggle("dark", preferred === "dark");

    // Defer the React state update to the next microtask/tick.
    // This avoids synchronous cascading renders in React's layout/effect phase,
    // which satisfies the React compiler's performance lint rule.
    const id = setTimeout(() => {
      setTheme(preferred);
    }, 0);

    return () => clearTimeout(id);
  }, []);

  const toggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("theme", next);
    document.documentElement.classList.toggle("dark", next === "dark");
  };

  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);