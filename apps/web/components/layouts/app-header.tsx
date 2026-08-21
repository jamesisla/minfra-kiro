"use client";

import { Moon, Sun, Building2, LogOut, Settings, Map, PieChart, FileCheck } from "lucide-react";
import { useTheme } from "@/components/providers/theme-provider";
import { useInfrastructureStore } from "@/lib/stores/infrastructure-store";
import { cn } from "@/lib/utils";

interface AppHeaderProps {
  onLogout?: () => void;
}

export function AppHeader({ onLogout }: AppHeaderProps) {
  const { theme, toggleTheme } = useTheme();
  const { tree, activeTab, setActiveTab } = useInfrastructureStore();
  const totalSedes = tree?.sedes.length ?? 0;

  return (
    <header className="h-12 shrink-0 flex items-center justify-between px-4 border-b border-border bg-card/80 backdrop-blur-sm z-30">
      {/* Logo / Nombre */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Building2 className="w-5 h-5 text-primary" />
          <span className="font-semibold text-sm tracking-tight">MInfra</span>
        </div>

        {/* Pestañas de Navegación Principal: Visor CAD vs Reportes vs Compliance */}
        <div className="flex items-center gap-1 bg-secondary/80 p-0.5 rounded-lg border border-border/60">
          <button
            onClick={() => setActiveTab("viewer")}
            className={cn(
              "px-2.5 py-1 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5",
              activeTab === "viewer"
                ? "bg-background text-foreground shadow-sm font-bold"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Map className="w-3.5 h-3.5 text-primary" />
            Visor CAD
          </button>
          <button
            onClick={() => setActiveTab("reports")}
            className={cn(
              "px-2.5 py-1 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5",
              activeTab === "reports"
                ? "bg-background text-foreground shadow-sm font-bold"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <PieChart className="w-3.5 h-3.5 text-emerald-500" />
            Reportes & Métricas
          </button>
          <button
            onClick={() => setActiveTab("compliance")}
            className={cn(
              "px-2.5 py-1 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5",
              activeTab === "compliance"
                ? "bg-background text-foreground shadow-sm font-bold"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <FileCheck className="w-3.5 h-3.5 text-blue-500" />
            Documentos & Compliance
          </button>
        </div>
      </div>

      {/* Stats rápidas */}
      {totalSedes > 0 && (
        <div className="hidden md:flex items-center gap-4 text-xs text-muted-foreground">
          <span>{totalSedes} {totalSedes === 1 ? "sede" : "sedes"}</span>
        </div>
      )}

      {/* Acciones */}
      <div className="flex items-center gap-1">
        {/* Toggle tema */}
        <button
          onClick={toggleTheme}
          className="w-8 h-8 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          title={theme === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
          aria-label="Cambiar tema"
        >
          {theme === "dark" ? (
            <Sun className="w-4 h-4" />
          ) : (
            <Moon className="w-4 h-4" />
          )}
        </button>

        {/* Configuración (placeholder) */}
        <button
          className="w-8 h-8 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          title="Configuración"
          aria-label="Configuración"
        >
          <Settings className="w-4 h-4" />
        </button>

        {/* Logout */}
        {onLogout && (
          <button
            onClick={onLogout}
            className="w-8 h-8 rounded-md flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-secondary transition-colors"
            title="Cerrar sesión"
            aria-label="Cerrar sesión"
          >
            <LogOut className="w-4 h-4" />
          </button>
        )}
      </div>
    </header>
  );
}
