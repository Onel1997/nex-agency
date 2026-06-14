"use client";

import { type ReactNode, useTransition } from "react";
import { Modal } from "./Modal";

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  variant?: "default" | "danger";
  confirmDisabled?: boolean;
  onConfirm: () => void | Promise<void>;
}

export function ConfirmDialog({
  open,
  onClose,
  title,
  description,
  children,
  confirmLabel,
  cancelLabel = "Abbrechen",
  variant = "default",
  confirmDisabled = false,
  onConfirm,
}: ConfirmDialogProps) {
  const [isPending, startTransition] = useTransition();

  const handleConfirm = () => {
    startTransition(async () => {
      await onConfirm();
    });
  };

  return (
    <Modal open={open} onClose={onClose} title={title} size="md">
      <div className="space-y-5">
        {description ? (
          <p className="text-sm leading-relaxed text-muted">{description}</p>
        ) : null}
        {children}
        <div className="flex flex-wrap justify-end gap-3 pt-1">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="dashboard-btn-secondary"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isPending || confirmDisabled}
            className={
              variant === "danger"
                ? "rounded-xl bg-red-500/15 px-4 py-2 text-sm font-medium text-red-200 ring-1 ring-red-500/25 transition-colors hover:bg-red-500/25 disabled:opacity-50"
                : "dashboard-btn-primary"
            }
          >
            {isPending ? "Bitte warten…" : confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}
