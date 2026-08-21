"use client";

import { useEffect } from "react";
import { X, Download, FileText, ExternalLink, Maximize2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface PdfPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  fileUrl: string | null;
  fileName?: string | null;
  mimeType?: string | null;
}

export function PdfPreviewModal({
  isOpen,
  onClose,
  title,
  fileUrl,
  fileName,
  mimeType,
}: PdfPreviewModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !fileUrl) return null;

  const isPdf = mimeType === "application/pdf" || fileUrl.toLowerCase().includes(".pdf");
  const isImage = mimeType?.startsWith("image/") || /\.(jpg|jpeg|png|webp|svg)$/i.test(fileUrl);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 sm:p-6 animate-in fade-in-0 duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-5xl h-[88vh] bg-background border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border bg-card/90">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/20">
              <FileText className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-foreground truncate">{title}</h3>
              {fileName && (
                <p className="text-[11px] font-mono text-muted-foreground truncate">{fileName}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <a
              href={fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              title="Abrir en pestaña nueva"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
            <a
              href={fileUrl}
              download={fileName || "documento"}
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              title="Descargar archivo"
            >
              <Download className="w-4 h-4" />
            </a>
            <div className="w-px h-4 bg-border mx-1" />
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              title="Cerrar vista previa"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Preview */}
        <div className="flex-1 bg-zinc-900/90 flex items-center justify-center overflow-hidden relative">
          {isPdf ? (
            <iframe
              src={`${fileUrl}#toolbar=1&navpanes=0`}
              className="w-full h-full border-0"
              title={title}
            />
          ) : isImage ? (
            <div className="p-4 max-h-full max-w-full flex items-center justify-center">
              <img
                src={fileUrl}
                alt={title}
                className="max-h-[75vh] max-w-full object-contain rounded-lg shadow-lg"
              />
            </div>
          ) : (
            <div className="text-center p-8 space-y-3 text-zinc-300">
              <FileText className="w-12 h-12 text-zinc-500 mx-auto" />
              <p className="text-sm font-medium">Este formato no puede previsualizarse en línea.</p>
              <a
                href={fileUrl}
                download={fileName || "documento"}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground font-semibold rounded-xl text-xs"
              >
                <Download className="w-3.5 h-3.5" /> Descargar para visualizar
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
