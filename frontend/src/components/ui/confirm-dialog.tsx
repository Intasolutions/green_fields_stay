"use client";

import { AlertTriangle } from "lucide-react";
import { createPortal } from "react-dom";

import { cn } from "@/lib/cn";

interface ConfirmDialogProps {
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "default" | "danger";
  isConfirming?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "default",
  isConfirming = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 p-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl">
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
              tone === "danger"
                ? "bg-red-100 text-red-600"
                : "bg-amber-100 text-amber-600",
            )}
          >
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
            <p className="mt-1 text-sm text-slate-500">{description}</p>
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onCancel}
            disabled={isConfirming}
            className="rounded-md border border-slate-200 px-3.5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-60"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={isConfirming}
            className={cn(
              "rounded-md px-3.5 py-2 text-sm font-medium text-white disabled:opacity-60",
              tone === "danger"
                ? "bg-red-600 hover:bg-red-700"
                : "bg-slate-900 hover:bg-slate-800",
            )}
          >
            {isConfirming ? "Please wait..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
