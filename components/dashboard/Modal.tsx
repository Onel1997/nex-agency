"use client";

import { X } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: "md" | "lg";
  layer?: "default" | "stacked";
  closeOnEscape?: boolean;
  closeOnBackdrop?: boolean;
}

export function Modal({
  open,
  onClose,
  title,
  children,
  size = "md",
  layer = "default",
  closeOnEscape = true,
  closeOnBackdrop = true,
}: ModalProps) {
  useEffect(() => {
    if (!open || !closeOnEscape) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown, true);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown, true);
    };
  }, [open, onClose, closeOnEscape]);

  useEffect(() => {
    if (!open || closeOnEscape) return;

    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open, closeOnEscape]);

  if (!open || typeof document === "undefined") return null;

  const zIndexClass = layer === "stacked" ? "z-[110]" : "z-[100]";

  return createPortal(
    <div className={`fixed inset-0 ${zIndexClass} flex items-end justify-center p-4 sm:items-center`}>
      {closeOnBackdrop ? (
        <button
          type="button"
          aria-label="Modal schließen"
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        />
      ) : (
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />
      )}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className={`dashboard-modal glass-card relative z-10 w-full rounded-2xl ${
          size === "lg" ? "max-w-2xl" : "max-w-lg"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4 sm:px-6">
          <h2
            id="modal-title"
            className="text-lg font-semibold tracking-tight text-foreground"
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="dashboard-icon-btn rounded-lg p-2 text-muted transition-colors hover:text-foreground"
            aria-label="Schließen"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="px-5 py-5 sm:px-6">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
