"use client";

import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

export function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const isDark = document.documentElement.classList.contains("dark");
    setTheme(isDark ? "dark" : "light");
  }, []);

  const toggleTheme = () => {
    if (theme === "light") {
      document.documentElement.classList.add("dark");
      localStorage.theme = "dark";
      setTheme("dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.theme = "light";
      setTheme("light");
    }
  };

  if (!mounted) {
    return (
      <div className="h-9 w-9 rounded-xl bg-transparent animate-pulse border border-slate-200/50 dark:border-slate-700/50" />
    );
  }

  return (
    <button
      onClick={toggleTheme}
      className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-800 transition-all duration-300 shadow-sm focus:outline-none cursor-pointer group"
      aria-label="Alternar tema"
    >
      <div className="relative h-5 w-5 flex items-center justify-center">
        {/* Sun Icon */}
        <Sun 
          className={`absolute h-5 w-5 transition-all duration-500 ease-spring ${
            theme === "dark" 
              ? "rotate-90 scale-0 opacity-0" 
              : "rotate-0 scale-100 opacity-100 text-slate-900"
          }`} 
        />
        {/* Moon Icon */}
        <Moon 
          className={`absolute h-5 w-5 transition-all duration-500 ease-spring ${
            theme === "dark" 
              ? "rotate-0 scale-100 opacity-100 text-white" 
              : "-rotate-90 scale-0 opacity-0"
          }`} 
        />
      </div>
      
      {/* Decorative hover tooltip */}
      <span className="absolute top-12 scale-0 rounded bg-slate-800 px-2 py-1 text-[10px] font-bold text-white group-hover:scale-100 transition-all duration-200 shadow-md">
        {theme === "dark" ? "Modo Claro" : "Modo Oscuro"}
      </span>
    </button>
  );
}
