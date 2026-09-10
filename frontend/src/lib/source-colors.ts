import type { BookingSource } from "@/lib/types";

interface SourceStyle {
  label: string;
  bar: string;
  dot: string;
}

export const SOURCE_STYLES: Record<BookingSource, SourceStyle> = {
  DIRECT: {
    label: "Direct",
    bar: "bg-blue-500 hover:bg-blue-600",
    dot: "bg-blue-500",
  },
  MMT: {
    label: "MakeMyTrip",
    bar: "bg-emerald-500 hover:bg-emerald-600",
    dot: "bg-emerald-500",
  },
  AGODA: {
    label: "Agoda",
    bar: "bg-purple-500 hover:bg-purple-600",
    dot: "bg-purple-500",
  },
  BOOKING_COM: {
    label: "Booking.com",
    bar: "bg-fuchsia-500 hover:bg-fuchsia-600",
    dot: "bg-fuchsia-500",
  },
  GOIBIBO: {
    label: "Goibibo",
    bar: "bg-amber-500 hover:bg-amber-600",
    dot: "bg-amber-500",
  },
  OTHER: {
    label: "Other",
    bar: "bg-slate-400 hover:bg-slate-500",
    dot: "bg-slate-400",
  },
};

export const BOOKING_SOURCES: BookingSource[] = [
  "DIRECT",
  "MMT",
  "AGODA",
  "BOOKING_COM",
  "GOIBIBO",
  "OTHER",
];

export const OTA_SOURCES: BookingSource[] = [
  "MMT",
  "AGODA",
  "BOOKING_COM",
  "GOIBIBO",
];
