import { SlidersHorizontal, X } from "lucide-react";

import { cn } from "@/lib/cn";

/**
 * Consistent filter-row shell used across Bookings/Expenses/Reports: a
 * light card with a filter icon, the filter controls (passed as children),
 * and an optional "Clear filters" action on the right.
 */
export function FilterBar({
  children,
  onClear,
  className,
}: {
  children: React.ReactNode;
  onClear?: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm",
        className,
      )}
    >
      <SlidersHorizontal className="h-4 w-4 shrink-0 text-slate-400" />
      <div className="flex flex-1 flex-wrap items-center gap-3">{children}</div>
      {onClear && (
        <button
          onClick={onClear}
          className="flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-700"
        >
          <X className="h-3.5 w-3.5" />
          Clear
        </button>
      )}
    </div>
  );
}

export function FilterField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
        {label}
      </span>
      {children}
    </div>
  );
}

/** A styled from/to date-range pair with a shared visual connector. */
export function DateRangeField({
  label,
  from,
  to,
  onFromChange,
  onToChange,
}: {
  label: string;
  from: string;
  to: string;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
}) {
  return (
    <FilterField label={label}>
      <div className="flex items-center gap-1.5">
        <input
          type="date"
          value={from}
          onChange={(e) => onFromChange(e.target.value)}
          className="input w-auto"
        />
        <span className="text-xs text-slate-400">to</span>
        <input
          type="date"
          value={to}
          onChange={(e) => onToChange(e.target.value)}
          className="input w-auto"
        />
      </div>
    </FilterField>
  );
}
