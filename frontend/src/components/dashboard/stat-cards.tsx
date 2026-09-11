"use client";

import { AlertTriangle, DoorOpen, LogIn, LogOut, TrendingUp } from "lucide-react";

import { useCurrentUser } from "@/lib/hooks/use-current-user";
import {
  useBookingsByCheckInDate,
  useBookingsByCheckOutDate,
} from "@/lib/hooks/use-bookings";
import { useRoomAvailability } from "@/lib/hooks/use-room-availability";
import { addDays, toDateOnly } from "@/lib/date-utils";
import { cn } from "@/lib/cn";

const TOTAL_ROOMS = 11;

interface StatCardProps {
  label: string;
  value: number | string;
  sublabel?: string;
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
  emphasis?: "warning";
}

function StatCard({ label, value, sublabel, icon: Icon, accent, emphasis }: StatCardProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-4 rounded-lg border bg-white p-4 shadow-sm",
        emphasis === "warning" ? "border-amber-200" : "border-slate-200",
      )}
    >
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${accent}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-semibold tabular-nums text-slate-900">
          {value}
        </p>
        <p className="text-xs text-slate-500">{label}</p>
        {sublabel && (
          <p
            className={cn(
              "mt-0.5 text-xs font-medium",
              emphasis === "warning" ? "text-amber-600" : "text-slate-400",
            )}
          >
            {sublabel}
          </p>
        )}
      </div>
    </div>
  );
}

export function StatCards() {
  const { data: currentUser } = useCurrentUser();
  const today = toDateOnly(new Date());
  const tomorrow = toDateOnly(addDays(new Date(), 1));

  const availability = useRoomAvailability(today, tomorrow);
  const checkIns = useBookingsByCheckInDate(today);
  const checkOuts = useBookingsByCheckOutDate(today);

  const availableRooms = availability.data
    ? availability.data.filter((entry) => entry.is_available).length
    : undefined;

  const occupancyPct =
    availableRooms !== undefined
      ? Math.round(((TOTAL_ROOMS - availableRooms) / TOTAL_ROOMS) * 100)
      : undefined;

  const pendingCheckIns = checkIns.data
    ? checkIns.data.filter((b) => b.status === "CONFIRMED")
    : undefined;

  const pendingCheckOuts = checkOuts.data
    ? checkOuts.data.filter((b) => b.status === "CHECKED_IN")
    : undefined;

  const checkOutsWithBalance = pendingCheckOuts?.filter(
    (b) => parseFloat(b.balance_due) > 0,
  );

  const isFinanceRole =
    currentUser?.role === "ADMIN" || currentUser?.role === "MANAGER";

  const todayRevenue = checkIns.data
    ?.filter((b) => b.status !== "CANCELLED")
    .reduce((sum, b) => sum + parseFloat(b.total_amount), 0);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        label={`Available Rooms (of ${TOTAL_ROOMS})`}
        value={availableRooms ?? "-"}
        sublabel={
          occupancyPct !== undefined ? `${occupancyPct}% occupied today` : undefined
        }
        icon={DoorOpen}
        accent="bg-emerald-100 text-emerald-700"
      />
      <StatCard
        label="Expected Check-ins Today"
        value={pendingCheckIns?.length ?? "-"}
        icon={LogIn}
        accent="bg-blue-100 text-blue-700"
      />
      <StatCard
        label="Expected Check-outs Today"
        value={pendingCheckOuts?.length ?? "-"}
        sublabel={
          checkOutsWithBalance && checkOutsWithBalance.length > 0
            ? `${checkOutsWithBalance.length} with balance due`
            : undefined
        }
        icon={LogOut}
        accent="bg-amber-100 text-amber-700"
        emphasis={
          checkOutsWithBalance && checkOutsWithBalance.length > 0
            ? "warning"
            : undefined
        }
      />
      {isFinanceRole ? (
        <StatCard
          label="New Bookings Revenue Today"
          value={
            todayRevenue !== undefined
              ? `Rs. ${todayRevenue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`
              : "-"
          }
          icon={TrendingUp}
          accent="bg-violet-100 text-violet-700"
        />
      ) : (
        <StatCard
          label="Rooms Occupied"
          value={occupancyPct !== undefined ? `${occupancyPct}%` : "-"}
          icon={AlertTriangle}
          accent="bg-slate-100 text-slate-600"
        />
      )}
    </div>
  );
}
