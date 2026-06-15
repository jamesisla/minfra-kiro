"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { AppHeader } from "./app-header";
import { SidebarNav } from "@/components/infrastructure/sidebar-nav";
import { ManagePanel } from "@/components/infrastructure/manage-modal";
import { cn } from "@/lib/utils";

interface AppLayoutProps {
  children: React.ReactNode;
  onLogout?: () => void;
}

const SIDEBAR_WIDTH = 260;
const SIDEBAR_MIN = 40;

export function AppLayout({ children, onLogout }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background">
      <AppHeader onLogout={onLogout} />

      <div className="flex flex-1 overflow-hidden relative">
        {/* Sidebar */}
        <aside
          className={cn(
            "flex flex-col border-r border-border bg-card transition-all duration-200 shrink-0",
            "relative overflow-hidden"
          )}
          style={{ width: sidebarOpen ? SIDEBAR_WIDTH : SIDEBAR_MIN }}
        >
          {/* Título sidebar */}
          {sidebarOpen && (
            <div className="px-3 py-2 border-b border-border">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Estructura
              </p>
            </div>
          )}

          {/* Árbol de navegación */}
          {sidebarOpen && (
            <div className="flex-1 overflow-y-auto overflow-x-hidden">
              <SidebarNav />
            </div>
          )}

          {/* Panel de gestión (crear sedes/edificios/pisos) */}
          {sidebarOpen && <ManagePanel />}

          {/* Toggle collapse button */}
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            className={cn(
              "absolute top-2 -right-3 w-6 h-6 rounded-full bg-card border border-border",
              "flex items-center justify-center shadow-sm z-10",
              "hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
            )}
            title={sidebarOpen ? "Colapsar panel" : "Expandir panel"}
          >
            {sidebarOpen ? (
              <ChevronLeft className="w-3.5 h-3.5" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5" />
            )}
          </button>
        </aside>

        {/* Contenido principal */}
        <main className="flex-1 flex overflow-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
