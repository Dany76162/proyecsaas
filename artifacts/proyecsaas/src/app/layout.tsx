import type { Metadata } from "next";
import { Inter } from "next/font/google";

import "@/app/globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "RaicesPilot | Infraestructura Operativa Inmobiliaria",
  description: "Infraestructura operativa para inmobiliarias que centraliza leads, propiedades, conversaciones y seguimiento comercial.",
  manifest: '/manifest.json',
  themeColor: '#07070E',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent' }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={inter.className}>{children}</body>
    </html>
  );
}

