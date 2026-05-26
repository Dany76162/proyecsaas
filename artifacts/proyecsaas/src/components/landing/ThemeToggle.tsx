"use client";

import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

export function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Verificar el estado inicial del tema
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
      <div className="h-9 w-9 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse border border-slate-200/50 dark:border-slate-700/50" />
    );
  }

  return (
    <button
      onClick={toggleTheme}
      className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200/50 dark:border-slate-700/50 transition-all duration-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500 cursor-pointer group"
      aria-label="Alternar tema"
    >
      <div className="relative h-5 w-5 flex items-center justify-center">
        {/* Sun Icon */}
        <Sun 
          className={`absolute h-5 w-5 transition-all duration-500 ease-spring ${
            theme === "dark" 
              ? "rotate-90 scale-0 opacity-0" 
              : "rotate-0 scale-100 opacity-100 text-amber-500"
          }`} 
        />
        {/* Moon Icon */}
        <Moon 
          className={`absolute h-5 w-5 transition-all duration-500 ease-spring ${
            theme === "dark" 
              ? "rotate-0 scale-100 opacity-100 text-indigo-400" 
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
