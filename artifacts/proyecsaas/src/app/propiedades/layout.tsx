import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Raíces Pilot Inmuebles | Buscador Global",
  description: "Encuentra la propiedad ideal. Miles de inmuebles de las mejores inmobiliarias en un solo lugar.",
  manifest: '/manifest-b2c.json',
};

export default function PropiedadesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
