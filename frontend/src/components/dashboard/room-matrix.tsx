"use client";

import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useMemo, useState } from "react";

import { useRoomAvailability } from "@/lib/hooks/use-room-availability";
import {
  addDays,
  formatShortDate,
  isSameDate,
  parseDateOnly,
  startOfDay,
  toDateOnly,
} from "@/lib/date-utils";
import { SOURCE_STYLES } from "@/lib/source-colors";
import type { RoomAvailabilityBooking } from "@/lib/types";
import { cn } from "@/lib/cn";

const VISIBLE_DAYS = 14;

interface RoomMatrixProps {
  onNewBooking: (params?: { roomId?: number; date?: string }) => void;
  onSelectBooking: (bookingId: string) => void;
}

export function RoomMatrix({ onNewBooking, onSelectBooking }: RoomMatrixProps) {
  const [rangeStart, setRangeStart] = useState(() => startOfDay(new Date()));

  const days = useMemo(
    () => Array.from({ length: VISIBLE_DAYS }, (_, i) => addDays(rangeStart, i)),
    [rangeStart],
  );

  const rangeEndExclusive = addDays(rangeStart, VISIBLE_DAYS);
  const startDateStr = toDateOnly(rangeStart);
  const endDateStr = toDateOnly(rangeEndExclusive);

  const { data: availability, isLoading, isError } = useRoomAvailability(
    startDateStr,
    endDateStr,
  );

  function goToPreviousWeek() {
    setRangeStart((prev) => addDays(prev, -7));
  }

  function goToNextWeek() {
    setRangeStart((prev) => addDays(prev, 7));
  }

  function goToToday() {
    setRangeStart(startOfDay(new Date()));
  }

  function handleDatePickerChange(value: string) {
    if (!value) return;
    setRangeStart(startOfDay(parseDateOnly(value)));
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
        <div className="flex items-center gap-2">
          <button
            onClick={goToPreviousWeek}
            className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50"
            aria-label="Previous week"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={goToNextWeek}
            className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50"
            aria-label="Next week"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <button
            onClick={goToToday}
            className="rounded-md border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            Today
          </button>
          <input
            type="date"
            value={toDateOnly(rangeStart)}
            onChange={(e) => handleDatePickerChange(e.target.value)}
            className="rounded-md border border-slate-200 px-2 py-1.5 text-sm text-slate-600"
          />
          <span className="text-sm text-slate-500">
            {formatShortDate(rangeStart)} &ndash;{" "}
            {formatShortDate(addDays(rangeStart, VISIBLE_DAYS - 1))}
          </span>
        </div>

        <div className="flex items-center gap-4">
          <Legend />
          <button
            onClick={() => onNewBooking()}
            className="flex items-center gap-1.5 rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800"
          >
            <Plus className="h-4 w-4" />
            New Booking
          </button>
        </div>
      </div>

      {isError && (
        <p className="px-4 py-6 text-sm text-red-600">
          Failed to load room availability.
        </p>
      )}

      {isLoading && (
        <p className="px-4 py-6 text-sm text-slate-500">Loading matrix...</p>
      )}

      {availability && (
        <div className="overflow-x-auto">
          <div
            className="grid min-w-[900px]"
            style={{
              gridTemplateColumns: `88px repeat(${VISIBLE_DAYS}, minmax(64px, 1fr))`,
            }}
          >
            {/* Header row */}
            <div className="sticky left-0 z-10 border-b border-slate-200 bg-slate-50 px-2 py-2 text-xs font-medium text-slate-500">
              Room
            </div>
            {days.map((day) => (
              <div
                key={toDateOnly(day)}
                className={cn(
                  "border-b border-l border-slate-200 px-1 py-2 text-center text-xs font-medium",
                  isSameDate(day, new Date())
                    ? "bg-blue-50 text-blue-700"
                    : "bg-slate-50 text-slate-500",
                )}
              >
                <div>{day.toLocaleDateString("en-US", { weekday: "short" })}</div>
                <div className="tabular-nums">{day.getDate()}</div>
              </div>
            ))}

            {/* Room rows */}
            {availability.map((entry) => (
              <RoomRow
                key={entry.room.id}
                roomNumber={entry.room.number}
                bookings={entry.bookings}
                days={days}
                onEmptySlotClick={(date) =>
                  onNewBooking({ roomId: entry.room.id, date })
                }
                onSelectBooking={onSelectBooking}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Legend() {
  const entries = Object.entries(SOURCE_STYLES).filter(([key]) =>
    ["DIRECT", "MMT", "AGODA", "BOOKING_COM"].includes(key),
  );

  return (
    <div className="hidden items-center gap-3 md:flex">
      {entries.map(([key, style]) => (
        <div key={key} className="flex items-center gap-1.5">
          <span className={cn("h-2.5 w-2.5 rounded-full", style.dot)} />
          <span className="text-xs text-slate-500">{style.label}</span>
        </div>
      ))}
    </div>
  );
}

interface RoomRowProps {
  roomNumber: string;
  bookings: RoomAvailabilityBooking[];
  days: Date[];
  onEmptySlotClick: (date: string) => void;
  onSelectBooking: (bookingId: string) => void;
}

function RoomRow({
  roomNumber,
  bookings,
  days,
  onEmptySlotClick,
  onSelectBooking,
}: RoomRowProps) {
  const rangeStart = days[0];
  const numDays = days.length;

  // Map each booking to a start/span expressed in day-columns within the
  // visible window, clipped at both edges.
  const segments = bookings
    .filter((b) => b.status !== "CANCELLED")
    .map((booking) => {
      const bookingStart = parseDateOnly(booking.check_in);
      const bookingEnd = parseDateOnly(booking.check_out);

      const startOffset = Math.round(
        (bookingStart.getTime() - rangeStart.getTime()) / 86400000,
      );
      const endOffset = Math.round(
        (bookingEnd.getTime() - rangeStart.getTime()) / 86400000,
      );

      const clippedStart = Math.max(startOffset, 0);
      const clippedEnd = Math.min(endOffset, numDays);

      if (clippedEnd <= clippedStart) return null;

      return {
        booking,
        gridColumnStart: clippedStart + 2, // +1 for 1-indexed, +1 for room label column
        gridColumnEnd: clippedEnd + 2,
      };
    })
    .filter((s): s is NonNullable<typeof s> => s !== null);

  const occupiedDayIndexes = new Set<number>();
  for (const seg of segments) {
    for (let i = seg.gridColumnStart - 2; i < seg.gridColumnEnd - 2; i++) {
      occupiedDayIndexes.add(i);
    }
  }

  return (
    <>
      <div className="sticky left-0 z-10 flex items-center border-b border-slate-100 bg-white px-2 py-2 text-sm font-medium text-slate-700">
        Room {roomNumber}
      </div>

      {days.map((day, index) => {
        if (occupiedDayIndexes.has(index)) {
          return (
            <div
              key={toDateOnly(day)}
              className="border-b border-l border-slate-100"
            />
          );
        }
        return (
          <button
            key={toDateOnly(day)}
            onClick={() => onEmptySlotClick(toDateOnly(day))}
            className="group border-b border-l border-slate-100 transition hover:bg-slate-50"
            title={`Book Room ${roomNumber} starting ${toDateOnly(day)}`}
          >
            <span className="hidden text-slate-300 group-hover:block">
              <Plus className="mx-auto h-3 w-3" />
            </span>
          </button>
        );
      })}

      {segments.map((seg) => (
        <button
          key={seg.booking.booking_id}
          onClick={() => onSelectBooking(seg.booking.booking_id)}
          style={{
            gridColumnStart: seg.gridColumnStart,
            gridColumnEnd: seg.gridColumnEnd,
          }}
          className={cn(
            "z-[1] m-0.5 flex items-center overflow-hidden rounded-md border-b border-l border-slate-100 px-2 py-1.5 text-left text-xs font-medium text-white shadow-sm transition",
            SOURCE_STYLES[seg.booking.source].bar,
            seg.booking.status === "CHECKED_IN" && "ring-2 ring-inset ring-white/40",
          )}
          title={`${seg.booking.guest_name} · ${seg.booking.status}`}
        >
          <span className="truncate">
            {seg.booking.guest_name}
            {seg.booking.profile_tag ? ` - ${seg.booking.profile_tag}` : ""}
          </span>
        </button>
      ))}
    </>
  );
}

export { VISIBLE_DAYS };
