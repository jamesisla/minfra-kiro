import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/theme-provider";

export const metadata: Metadata = {
  title: "MInfra — Gestión de Infraestructura Universitaria",
  description: "Sistema de gestión de infraestructura para universidades con sedes múltiples",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className="min-h-screen antialiased">{
        <ThemeProvider>
          {children}
        </ThemeProvider>
      }</body>
    </html>
  );
}
