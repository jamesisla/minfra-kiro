"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Layers } from "lucide-react";
import { AppHeader } from "./app-header";
import { SidebarNav } from "@/components/infrastructure/sidebar-nav";
import { ManagePanel } from "@/components/infrastructure/manage-modal";
import { cn } from "@/lib/utils";

interface AppLayoutProps {
  children: React.ReactNode;
  onLogout?: () => void;
}

const SIDEBAR_WIDTH = 310;
const SIDEBAR_MIN = 48;

export function AppLayout({ children, onLogout }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background">
      <AppHeader onLogout={onLogout} />

      <div className="flex flex-1 overflow-hidden relative">
        {/* Sidebar */}
        <aside
          className={cn(
            "flex flex-col border-r border-border bg-card transition-all duration-200 shrink-0 select-none",
            "relative overflow-hidden"
          )}
          style={{ width: sidebarOpen ? SIDEBAR_WIDTH : SIDEBAR_MIN }}
        >
          {/* Título y botón colapsar sidebar */}
          {sidebarOpen ? (
            <div className="px-3 py-2 border-b border-border flex items-center justify-between shrink-0">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Estructura
              </span>
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-1 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                title="Colapsar panel lateral"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="py-2.5 border-b border-border flex flex-col items-center justify-center shrink-0">
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                title="Expandir panel lateral"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Árbol de navegación */}
          {sidebarOpen ? (
            <div className="flex-1 overflow-y-auto overflow-x-hidden">
              <SidebarNav />
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center pt-4 text-muted-foreground">
              <Layers className="w-5 h-5 opacity-50" />
            </div>
          )}

          {/* Panel de gestión (crear sedes/edificios/pisos) */}
          {sidebarOpen && <ManagePanel />}
        </aside>

        {/* Contenido principal */}
        <main className="flex-1 flex overflow-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
