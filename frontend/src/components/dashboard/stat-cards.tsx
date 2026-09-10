"use client";

import { DoorOpen, LogIn, LogOut } from "lucide-react";

import { useBookingsByCheckInDate, useBookingsByCheckOutDate } from "@/lib/hooks/use-bookings";
import { useRoomAvailability } from "@/lib/hooks/use-room-availability";
import { addDays, toDateOnly } from "@/lib/date-utils";

const TOTAL_ROOMS = 11;

interface StatCardProps {
  label: string;
  value: number | string;
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
}

function StatCard({ label, value, icon: Icon, accent }: StatCardProps) {
  return (
    <div className="flex items-center gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${accent}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-2xl font-semibold text-slate-900 tabular-nums">
          {value}
        </p>
        <p className="text-xs text-slate-500">{label}</p>
      </div>
    </div>
  );
}

export function StatCards() {
  const today = toDateOnly(new Date());
  const tomorrow = toDateOnly(addDays(new Date(), 1));

  const availability = useRoomAvailability(today, tomorrow);
  const checkIns = useBookingsByCheckInDate(today);
  const checkOuts = useBookingsByCheckOutDate(today);

  const availableRooms = availability.data
    ? availability.data.filter((entry) => entry.is_available).length
    : undefined;

  const checkInsToday = checkIns.data
    ? checkIns.data.filter((b) => b.status === "CONFIRMED").length
    : undefined;

  const checkOutsToday = checkOuts.data
    ? checkOuts.data.filter((b) => b.status === "CHECKED_IN").length
    : undefined;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <StatCard
        label={`Available Rooms Today (of ${TOTAL_ROOMS})`}
        value={availableRooms ?? "-"}
        icon={DoorOpen}
        accent="bg-emerald-100 text-emerald-700"
      />
      <StatCard
        label="Expected Check-ins Today"
        value={checkInsToday ?? "-"}
        icon={LogIn}
        accent="bg-blue-100 text-blue-700"
      />
      <StatCard
        label="Expected Check-outs Today"
        value={checkOutsToday ?? "-"}
        icon={LogOut}
        accent="bg-amber-100 text-amber-700"
      />
    </div>
  );
}
