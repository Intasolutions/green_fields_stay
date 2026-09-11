import { Building2 } from "lucide-react";

import { SOURCE_STYLES } from "@/lib/source-colors";
import type { BookingSource } from "@/lib/types";
import { cn } from "@/lib/cn";

const SOURCE_INITIAL: Record<BookingSource, string> = {
  DIRECT: "",
  MMT: "M",
  AGODA: "A",
  BOOKING_COM: "B",
  GOIBIBO: "G",
  OTHER: "?",
};

const SOURCE_TILE_BG: Record<BookingSource, string> = {
  DIRECT: "bg-blue-500",
  MMT: "bg-emerald-500",
  AGODA: "bg-purple-500",
  BOOKING_COM: "bg-fuchsia-600",
  GOIBIBO: "bg-amber-500",
  OTHER: "bg-slate-400",
};

interface SourceLogoProps {
  source: BookingSource;
  size?: "xs" | "sm" | "md";
  withLabel?: boolean;
  className?: string;
}

const SIZE_CLASSES: Record<
  NonNullable<SourceLogoProps["size"]>,
  { tile: string; text: string; icon: string }
> = {
  xs: { tile: "h-4 w-4 text-[9px]", text: "text-xs", icon: "h-2.5 w-2.5" },
  sm: { tile: "h-5 w-5 text-[10px]", text: "text-sm", icon: "h-3 w-3" },
  md: { tile: "h-7 w-7 text-xs", text: "text-sm", icon: "h-4 w-4" },
};

/**
 * A compact, brand-colored monogram tile for a booking source, used
 * wherever a raw text label or plain dot previously stood in for the OTA
 * (or Direct). Not the real trademarked OTA logos - a colored initial mark
 * that stays instantly recognizable without any external brand assets.
 */
export function SourceLogo({
  source,
  size = "sm",
  withLabel = false,
  className,
}: SourceLogoProps) {
  const sizing = SIZE_CLASSES[size];
  const label = SOURCE_STYLES[source].label;

  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <span
        className={cn(
          "flex shrink-0 items-center justify-center rounded-md font-bold text-white",
          sizing.tile,
          SOURCE_TILE_BG[source],
        )}
        title={label}
        aria-hidden={withLabel}
      >
        {source === "DIRECT" ? (
          <Building2 className={sizing.icon} />
        ) : (
          SOURCE_INITIAL[source]
        )}
      </span>
      {withLabel && (
        <span className={cn("text-slate-700", sizing.text)}>{label}</span>
      )}
    </span>
  );
}
