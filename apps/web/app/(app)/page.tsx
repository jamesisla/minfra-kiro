"use client";

/**
 * Página principal de MInfra.
 * Compone: AppLayout (sidebar + header) + DxfViewer + ItemInfoPopup.
 * Requiere autenticación — si no hay token, redirige al login.
 */

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { AppLayout } from "@/components/layouts/app-layout";
import { DxfViewer } from "@/components/infrastructure/dxf-viewer";
import { ItemInfoPopup } from "@/components/infrastructure/item-info-popup";
import { useInfrastructureStore } from "@/lib/stores/infrastructure-store";

export default function AppPage() {
  const router = useRouter();
  const { authToken, setAuthToken, fetchTree } = useInfrastructureStore();
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    // Leer token guardado
    const stored = localStorage.getItem("minfra-token");
    if (!stored) {
      router.replace("/login");
      return;
    }
    setAuthToken(stored);
    fetchTree(stored);
  }, [router, setAuthToken, fetchTree]);

  const handleLogout = () => {
    localStorage.removeItem("minfra-token");
    setAuthToken(null);
    router.replace("/login");
  };

  if (!authToken) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
      <AppLayout onLogout={handleLogout}>
        <DxfViewer />
      </AppLayout>
      {/* Popup flotante — fuera del layout para no heredar overflow:hidden */}
      <ItemInfoPopup />
    </>
  );
}
