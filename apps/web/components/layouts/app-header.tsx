"use client";

import { Moon, Sun, Building2, LogOut, Settings } from "lucide-react";
import { useTheme } from "@/components/providers/theme-provider";
import { useInfrastructureStore } from "@/lib/stores/infrastructure-store";

interface AppHeaderProps {
  onLogout?: () => void;
}

export function AppHeader({ onLogout }: AppHeaderProps) {
  const { theme, toggleTheme } = useTheme();
  const { tree } = useInfrastructureStore();
  const totalSedes = tree?.sedes.length ?? 0;

  return (
    <header className="h-12 shrink-0 flex items-center justify-between px-4 border-b border-border bg-card/80 backdrop-blur-sm z-30">
      {/* Logo / Nombre */}
      <div className="flex items-center gap-2">
        <Building2 className="w-5 h-5 text-primary" />
        <span className="font-semibold text-sm tracking-tight">MInfra</span>
        <span className="hidden sm:inline text-xs text-muted-foreground font-normal ml-1">
          Gestión de Infraestructura Universitaria
        </span>
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
