"use client";

import { AlertCircle, LogIn, LogOut } from "lucide-react";

import { SourceLogo } from "@/components/source-logo";
import {
  useBookingsByCheckInDate,
  useBookingsByCheckOutDate,
} from "@/lib/hooks/use-bookings";
import { toDateOnly } from "@/lib/date-utils";
import type { Booking } from "@/lib/types";
import { cn } from "@/lib/cn";

interface TodaysScheduleProps {
  onSelectBooking: (bookingId: string) => void;
}

export function TodaysSchedule({ onSelectBooking }: TodaysScheduleProps) {
  const today = toDateOnly(new Date());
  const checkIns = useBookingsByCheckInDate(today);
  const checkOuts = useBookingsByCheckOutDate(today);

  const arrivals = checkIns.data?.filter((b) => b.status === "CONFIRMED") ?? [];
  const departures =
    checkOuts.data?.filter((b) => b.status === "CHECKED_IN") ?? [];

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <ScheduleList
        title="Arriving Today"
        icon={LogIn}
        iconAccent="bg-blue-100 text-blue-700"
        bookings={arrivals}
        emptyLabel="No arrivals scheduled for today."
        onSelectBooking={onSelectBooking}
      />
      <ScheduleList
        title="Departing Today"
        icon={LogOut}
        iconAccent="bg-amber-100 text-amber-700"
        bookings={departures}
        emptyLabel="No departures scheduled for today."
        onSelectBooking={onSelectBooking}
      />
    </div>
  );
}

function ScheduleList({
  title,
  icon: Icon,
  iconAccent,
  bookings,
  emptyLabel,
  onSelectBooking,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  iconAccent: string;
  bookings: Booking[];
  emptyLabel: string;
  onSelectBooking: (bookingId: string) => void;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-3">
        <span className={cn("flex h-6 w-6 items-center justify-center rounded-full", iconAccent)}>
          <Icon className="h-3.5 w-3.5" />
        </span>
        <h2 className="text-sm font-semibold text-slate-700">{title}</h2>
        <span className="ml-auto text-xs text-slate-400">
          {bookings.length}
        </span>
      </div>

      {bookings.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-slate-400">
          {emptyLabel}
        </p>
      ) : (
        <ul className="max-h-72 divide-y divide-slate-100 overflow-y-auto">
          {bookings.map((booking) => {
            const balanceDue = parseFloat(booking.balance_due);
            return (
              <li key={booking.id}>
                <button
                  onClick={() => onSelectBooking(booking.id)}
                  className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left transition hover:bg-slate-50"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900">
                      {booking.guest.name}
                    </p>
                    <p className="truncate text-xs text-slate-400">
                      Room{booking.allocated_rooms.length > 1 ? "s" : ""}{" "}
                      {booking.allocated_rooms.map((r) => r.room_number).join(", ")}
                      {booking.profile_tag && ` · ${booking.profile_tag}`}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {balanceDue > 0 && (
                      <span
                        className="flex items-center gap-1 text-xs font-medium text-red-600"
                        title={`Balance due: Rs. ${booking.balance_due}`}
                      >
                        <AlertCircle className="h-3.5 w-3.5" />
                      </span>
                    )}
                    <SourceLogo source={booking.source} size="xs" />
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
