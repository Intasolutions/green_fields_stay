import { cn } from "@/lib/cn";
import type { BookingStatus } from "@/lib/types";

const STATUS_STYLES: Record<BookingStatus, string> = {
  CONFIRMED: "bg-blue-100 text-blue-700",
  CHECKED_IN: "bg-emerald-100 text-emerald-700",
  CHECKED_OUT: "bg-slate-100 text-slate-600",
  CANCELLED: "bg-red-100 text-red-700",
};

export function StatusBadge({ status }: { status: BookingStatus }) {
  return (
    <span
      className={cn(
        "inline-block rounded-full px-2.5 py-1 text-xs font-medium",
        STATUS_STYLES[status],
      )}
    >
      {status.replace("_", " ")}
    </span>
  );
}
