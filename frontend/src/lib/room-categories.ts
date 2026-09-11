import type { BedType, RoomCategory } from "@/lib/types";

export const ROOM_CATEGORIES: RoomCategory[] = ["NORMAL", "DELUXE"];

export const ROOM_CATEGORY_LABELS: Record<RoomCategory, string> = {
  NORMAL: "Normal",
  DELUXE: "Deluxe",
};

export const ROOM_CATEGORY_BADGE: Record<RoomCategory, string> = {
  NORMAL: "bg-slate-100 text-slate-600",
  DELUXE: "bg-amber-100 text-amber-700",
};

export const BED_TYPES: BedType[] = ["SINGLE", "DOUBLE", "TWIN", "QUEEN", "KING"];

export const BED_TYPE_LABELS: Record<BedType, string> = {
  SINGLE: "Single",
  DOUBLE: "Double",
  TWIN: "Twin",
  QUEEN: "Queen",
  KING: "King",
};
