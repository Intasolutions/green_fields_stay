"use client";

import { useState } from "react";

import { BookingDetailModal } from "@/components/dashboard/booking-detail-modal";
import { NewBookingModal } from "@/components/dashboard/new-booking-modal";
import { RoomMatrix } from "@/components/dashboard/room-matrix";
import { StatCards } from "@/components/dashboard/stat-cards";
import { addDays, toDateOnly } from "@/lib/date-utils";
import { useRoomAvailability } from "@/lib/hooks/use-room-availability";

interface NewBookingState {
  roomId?: number;
  date?: string;
}

export default function DashboardPage() {
  const [newBookingState, setNewBookingState] =
    useState<NewBookingState | null>(null);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(
    null,
  );

  // Reused only to source the room list (id + number) for the multi-room
  // selector in the New Booking modal.
  const today = toDateOnly(new Date());
  const tomorrow = toDateOnly(addDays(new Date(), 1));
  const { data: availability } = useRoomAvailability(today, tomorrow);
  const rooms = availability?.map((entry) => entry.room) ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">
          Front Desk Dashboard
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Today&apos;s overview and the 11-room availability matrix.
        </p>
      </div>

      <StatCards />

      <RoomMatrix
        onNewBooking={(params) => setNewBookingState(params ?? {})}
        onSelectBooking={(bookingId) => setSelectedBookingId(bookingId)}
      />

      {newBookingState && (
        <NewBookingModal
          rooms={rooms}
          initialRoomId={newBookingState.roomId}
          initialDate={newBookingState.date}
          onClose={() => setNewBookingState(null)}
          onCreated={() => setNewBookingState(null)}
        />
      )}

      {selectedBookingId && (
        <BookingDetailModal
          bookingId={selectedBookingId}
          onClose={() => setSelectedBookingId(null)}
        />
      )}
    </div>
  );
}
