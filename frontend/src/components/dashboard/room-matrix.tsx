"use client";

import { AlertCircle, ChevronLeft, ChevronRight, Plus } from "lucide-react";
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
import { Tooltip } from "@/components/ui/tooltip";
import { SourceLogo } from "@/components/source-logo";

const VISIBLE_DAYS = 14;
const ROOM_COL_WIDTH = 96;
const DAY_COL_WIDTH = 68;
const ROW_HEIGHT = 52;

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

  const todayOffset = days.findIndex((d) => isSameDate(d, new Date()));

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

  const gridWidth = ROOM_COL_WIDTH + VISIBLE_DAYS * DAY_COL_WIDTH;

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-md border border-slate-200">
            <button
              onClick={goToPreviousWeek}
              className="flex h-8 w-8 items-center justify-center text-slate-600 hover:bg-slate-50"
              aria-label="Previous week"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="h-5 w-px bg-slate-200" />
            <button
              onClick={goToNextWeek}
              className="flex h-8 w-8 items-center justify-center text-slate-600 hover:bg-slate-50"
              aria-label="Next week"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
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
          <span className="text-sm font-medium text-slate-700">
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
        <div className="space-y-2 p-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-11 animate-pulse rounded-md bg-slate-100" />
          ))}
        </div>
      )}

      {availability && (
        <div className="overflow-x-auto">
          <div className="relative" style={{ width: gridWidth, minWidth: "100%" }}>
            {/* Sticky day header */}
            <div
              className="sticky top-0 z-20 flex border-b border-slate-200 bg-white"
              style={{ height: 40 }}
            >
              <div
                className="sticky left-0 z-20 shrink-0 border-r border-slate-200 bg-white"
                style={{ width: ROOM_COL_WIDTH }}
              />
              {days.map((day, i) => {
                const today = isSameDate(day, new Date());
                return (
                  <div
                    key={toDateOnly(day)}
                    className={cn(
                      "flex shrink-0 flex-col items-center justify-center border-r border-slate-100 text-xs",
                      today ? "bg-blue-50/70 font-semibold text-blue-700" : "text-slate-500",
                      i === 0 && "border-l",
                    )}
                    style={{ width: DAY_COL_WIDTH }}
                  >
                    <span className="uppercase tracking-wide">
                      {day.toLocaleDateString("en-US", { weekday: "short" })}
                    </span>
                    <span className="tabular-nums text-[13px] text-slate-700">
                      {day.getDate()}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Room rows container, with a background grid + today line */}
            <div className="relative">
              {/* vertical grid lines */}
              <div
                className="pointer-events-none absolute inset-0 flex"
                aria-hidden
              >
                <div
                  className="shrink-0 border-r border-slate-200"
                  style={{ width: ROOM_COL_WIDTH }}
                />
                {days.map((day, i) => (
                  <div
                    key={toDateOnly(day)}
                    className={cn(
                      "shrink-0 border-r border-slate-100",
                      i === 0 && "border-l",
                    )}
                    style={{ width: DAY_COL_WIDTH }}
                  />
                ))}
              </div>

              {/* today marker line */}
              {todayOffset >= 0 && (
                <div
                  className="pointer-events-none absolute top-0 bottom-0 z-10 w-px bg-blue-400"
                  style={{
                    left: ROOM_COL_WIDTH + todayOffset * DAY_COL_WIDTH,
                  }}
                  aria-hidden
                />
              )}

              {availability.map((entry, rowIndex) => (
                <RoomRow
                  key={entry.room.id}
                  roomNumber={entry.room.number}
                  isAvailableNow={entry.is_available}
                  bookings={entry.bookings}
                  days={days}
                  isLastRow={rowIndex === availability.length - 1}
                  onEmptySlotClick={(date) =>
                    onNewBooking({ roomId: entry.room.id, date })
                  }
                  onSelectBooking={onSelectBooking}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Legend() {
  const sources = (["DIRECT", "MMT", "AGODA", "BOOKING_COM"] as const);

  return (
    <div className="hidden items-center gap-3 border-r border-slate-200 pr-4 md:flex">
      {sources.map((source) => (
        <SourceLogo key={source} source={source} size="xs" withLabel />
      ))}
    </div>
  );
}

interface RoomRowProps {
  roomNumber: string;
  isAvailableNow: boolean;
  bookings: RoomAvailabilityBooking[];
  days: Date[];
  isLastRow: boolean;
  onEmptySlotClick: (date: string) => void;
  onSelectBooking: (bookingId: string) => void;
}

function RoomRow({
  roomNumber,
  isAvailableNow,
  bookings,
  days,
  isLastRow,
  onEmptySlotClick,
  onSelectBooking,
}: RoomRowProps) {
  const rangeStart = days[0];
  const numDays = days.length;

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
        startCol: clippedStart,
        span: clippedEnd - clippedStart,
        continuesLeft: startOffset < 0,
        continuesRight: endOffset > numDays,
      };
    })
    .filter((s): s is NonNullable<typeof s> => s !== null);

  return (
    <div
      className={cn(
        "flex",
        !isLastRow && "border-b border-slate-100",
      )}
      style={{ height: ROW_HEIGHT }}
    >
      <div
        className="sticky left-0 z-10 flex shrink-0 items-center gap-2 border-r border-slate-200 bg-white px-3"
        style={{ width: ROOM_COL_WIDTH }}
      >
        <span
          className={cn(
            "h-2 w-2 shrink-0 rounded-full",
            isAvailableNow ? "bg-emerald-400" : "bg-slate-300",
          )}
        />
        <span className="text-sm font-medium text-slate-700">
          Room {roomNumber}
        </span>
      </div>

      <div className="relative shrink-0" style={{ width: numDays * DAY_COL_WIDTH }}>
        {/* Empty-slot click targets */}
        <div className="absolute inset-0 flex">
          {days.map((day, index) => {
            const isOccupied = segments.some(
              (s) => index >= s.startCol && index < s.startCol + s.span,
            );
            if (isOccupied) {
              return <div key={toDateOnly(day)} style={{ width: DAY_COL_WIDTH }} />;
            }
            return (
              <Tooltip
                key={toDateOnly(day)}
                label={`Book Room ${roomNumber} · ${formatShortDate(day)}`}
                className="items-stretch"
                style={{ width: DAY_COL_WIDTH }}
              >
                <button
                  onClick={() => onEmptySlotClick(toDateOnly(day))}
                  className="group flex w-full items-center justify-center transition hover:bg-slate-100"
                >
                  <Plus className="h-4 w-4 text-slate-400 opacity-0 transition group-hover:opacity-100" />
                </button>
              </Tooltip>
            );
          })}
        </div>

        {/* Floating booking bars */}
        {segments.map((seg) => {
          const balanceDue = parseFloat(seg.booking.balance_due);
          return (
            <button
              key={seg.booking.booking_id}
              onClick={() => onSelectBooking(seg.booking.booking_id)}
              className={cn(
                "absolute top-1.5 bottom-1.5 flex items-center gap-1.5 overflow-hidden px-2.5 text-left text-xs font-medium text-white shadow-sm transition hover:brightness-95",
                SOURCE_STYLES[seg.booking.source].bar,
                seg.booking.status === "CHECKED_IN" &&
                  "ring-2 ring-inset ring-white/50",
                seg.continuesLeft ? "rounded-l-none" : "rounded-l-md",
                seg.continuesRight ? "rounded-r-none" : "rounded-r-md",
              )}
              style={{
                left: seg.startCol * DAY_COL_WIDTH + 1,
                width: seg.span * DAY_COL_WIDTH - 2,
              }}
              title={`${seg.booking.guest_name} · ${seg.booking.status}${balanceDue > 0 ? ` · Balance due Rs. ${seg.booking.balance_due}` : ""}`}
            >
              <span className="truncate">
                {seg.booking.guest_name}
                {seg.booking.profile_tag ? ` - ${seg.booking.profile_tag}` : ""}
              </span>
              {balanceDue > 0 && (
                <AlertCircle className="ml-auto h-3.5 w-3.5 shrink-0 text-white/90" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export { VISIBLE_DAYS };
