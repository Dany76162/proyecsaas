"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/landing/ThemeToggle";

const DEMO_WHATSAPP_URL =
  "https://wa.me/5491166037990?text=Hola%2C%20quiero%20solicitar%20una%20demo%20de%20Ra%C3%ADces%20Pilot%20para%20mi%20inmobiliaria.";

// Los anchors apuntan a `/#...` (no solo `#...`) para que funcionen desde
// cualquier página (ej. /app-movil): navegan a la landing y hacen scroll a la
// sección. Con `#...` a secas, en páginas que no son la landing no pasaba nada.
const NAV_LINKS = [
  { href: "/#producto", label: "Producto", isAnchor: true },
  { href: "/#como-funciona", label: "Cómo funciona", isAnchor: true },
  { href: "/#tour-360", label: "Tour 360°", isAnchor: true },
  { href: "/#desarrollos", label: "Desarrollos", isAnchor: true },
  { href: "/#beneficios", label: "Beneficios", isAnchor: true },
  { href: "/#contacto", label: "Contacto", isAnchor: true },
  { href: "/propiedades", label: "Propiedades", isAnchor: false },
  { href: "/app-movil", label: "App", isAnchor: false },
] as const;

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const close = () => setIsOpen(false);

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md transition-colors duration-300 font-sans">
      {/* ── Barra principal ──────────────────────────────────────────────── */}
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">

        {/* Logo */}
        <div className="flex items-center gap-0 shrink-0">
          <img
            src="/brand/logo_transparent_icon.png"
            alt="RaícesPilot Logo"
            className="h-10 sm:h-16 w-auto object-contain brightness-0 dark:invert"
          />
          <span className="text-base sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white -ml-1">
            <span className="text-brand-600 dark:text-brand-400">RAÍCES</span>
            <span className="font-light">Pilot</span>
          </span>
        </div>

        {/* Nav desktop — oculto en mobile */}
        <nav className="hidden items-center gap-4 xl:gap-6 lg:flex">
          {NAV_LINKS.map((link) =>
            link.isAnchor ? (
              <a
                key={link.href}
                href={link.href}
                className="whitespace-nowrap text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-brand-600 dark:hover:text-brand-400 transition"
              >
                {link.label}
              </a>
            ) : (
              <Link
                key={link.href}
                href={link.href}
                className="whitespace-nowrap text-sm font-semibold text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-350 transition"
              >
                {link.label}
              </Link>
            )
          )}
        </nav>

        {/* Acciones derecha */}
        <div className="flex items-center gap-2 sm:gap-3">
          <ThemeToggle />

          {/* Desktop: Acceder + Solicitar demo */}
          <Button
            variant="ghost"
            asChild
            className="hidden lg:inline-flex dark:text-slate-200 dark:hover:bg-slate-900"
          >
            <Link href="/login">Acceder</Link>
          </Button>
          <Button asChild className="hidden lg:inline-flex whitespace-nowrap">
            <a href={DEMO_WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
              Solicitar demo
            </a>
          </Button>

          {/* Mobile: Acceder compacto */}
          <Button asChild size="sm" className="lg:hidden">
            <Link href="/login">Acceder</Link>
          </Button>

          {/* Botón hamburguesa — solo mobile */}
          <button
            type="button"
            onClick={() => setIsOpen((v) => !v)}
            aria-label={isOpen ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={isOpen}
            aria-controls="mobile-menu"
            className="lg:hidden flex items-center justify-center h-9 w-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* ── Menú mobile desplegable ──────────────────────────────────────── */}
      {isOpen && (
        <div
          id="mobile-menu"
          className="lg:hidden border-t border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md"
        >
          <nav className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800/70">
            {NAV_LINKS.map((link) =>
              link.isAnchor ? (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={close}
                  className="px-6 py-4 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-900/60 transition-colors"
                >
                  {link.label}
                </a>
              ) : (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={close}
                  className="px-6 py-4 text-sm font-semibold text-brand-600 dark:text-brand-400 hover:bg-slate-50 dark:hover:bg-slate-900/60 transition-colors"
                >
                  {link.label}
                </Link>
              )
            )}

            {/* CTA Solicitar demo al pie del menú */}
            <div className="px-6 py-4">
              <a
                href={DEMO_WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                onClick={close}
                className="flex w-full items-center justify-center rounded-xl bg-brand-600 hover:bg-brand-700 active:bg-brand-800 px-4 py-3 text-sm font-bold text-white transition-colors shadow-sm"
              >
                Solicitar demo
              </a>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
