"use client";

import { Pencil, Trash2 } from "lucide-react";

interface RowActionsProps {
  onEdit: () => void;
  onDelete: () => void;
  /** Used in the button labels, e.g. "booking" -> "Edit booking". */
  itemLabel: string;
}

/**
 * Edit / delete icon buttons for a table row or card. Clicks don't bubble,
 * so rows that open a detail view on click keep working.
 */
export function RowActions({ onEdit, onDelete, itemLabel }: RowActionsProps) {
  return (
    <div className="inline-flex items-center gap-1">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onEdit();
        }}
        className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700"
        aria-label={`Edit ${itemLabel}`}
        title={`Edit ${itemLabel}`}
      >
        <Pencil className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-red-50 hover:text-red-600"
        aria-label={`Delete ${itemLabel}`}
        title={`Delete ${itemLabel}`}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
