"use client";

import { Search } from "lucide-react";
import { useState } from "react";

import { BookingDetailModal } from "@/components/dashboard/booking-detail-modal";
import { StatusBadge } from "@/components/status-badge";
import { useBookingsList } from "@/lib/hooks/use-bookings";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import { SOURCE_STYLES } from "@/lib/source-colors";
import type { BookingStatus } from "@/lib/types";

const STATUS_OPTIONS: { value: BookingStatus | ""; label: string }[] = [
  { value: "", label: "All statuses" },
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "CHECKED_IN", label: "Checked In" },
  { value: "CHECKED_OUT", label: "Checked Out" },
  { value: "CANCELLED", label: "Cancelled" },
];

const PAGE_SIZE = 20;

export default function BookingsPage() {
  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState<BookingStatus | "">("");
  const [page, setPage] = useState(1);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(
    null,
  );

  const debouncedSearch = useDebouncedValue(searchInput);

  const { data, isPending, isError, isPlaceholderData } = useBookingsList({
    search: debouncedSearch,
    status: statusFilter,
    page,
    pageSize: PAGE_SIZE,
  });

  const totalPages = data ? Math.max(1, Math.ceil(data.count / PAGE_SIZE)) : 1;

  function handleSearchChange(value: string) {
    setSearchInput(value);
    setPage(1);
  }

  function handleStatusChange(value: BookingStatus | "") {
    setStatusFilter(value);
    setPage(1);
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">Bookings</h1>
        <p className="mt-1 text-sm text-slate-500">
          Search and review historical and active reservations.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search by guest name or phone..."
            className="input pl-9"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => handleStatusChange(e.target.value as BookingStatus | "")}
          className="input w-auto"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3">Guest</th>
                <th className="px-4 py-3">Rooms</th>
                <th className="px-4 py-3">Check-In</th>
                <th className="px-4 py-3">Check-Out</th>
                <th className="px-4 py-3">Source</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3 text-right">Balance</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isPending && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                    Loading bookings...
                  </td>
                </tr>
              )}

              {isError && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-red-600">
                    Failed to load bookings. Please try again.
                  </td>
                </tr>
              )}

              {!isPending && !isError && data?.results.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                    No bookings match your search.
                  </td>
                </tr>
              )}

              {data?.results.map((booking) => (
                <tr
                  key={booking.id}
                  onClick={() => setSelectedBookingId(booking.id)}
                  className="cursor-pointer transition hover:bg-slate-50"
                >
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900">
                      {booking.guest.name}
                    </div>
                    <div className="text-xs text-slate-400">
                      {booking.guest.phone}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {booking.allocated_rooms
                      .map((r) => r.room_number)
                      .join(", ")}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {booking.check_in}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {booking.check_out}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {SOURCE_STYLES[booking.source].label}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-slate-900">
                    Rs. {booking.total_amount}
                  </td>
                  <td className="px-4 py-3 text-right font-medium">
                    <span
                      className={
                        parseFloat(booking.balance_due) > 0
                          ? "text-red-600"
                          : "text-emerald-600"
                      }
                    >
                      Rs. {booking.balance_due}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={booking.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {data && data.count > 0 && (
          <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-sm text-slate-500">
            <span>
              Showing {(page - 1) * PAGE_SIZE + 1}
              &ndash;
              {Math.min(page * PAGE_SIZE, data.count)} of {data.count}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="rounded-md border border-slate-200 px-3 py-1.5 font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages || isPlaceholderData}
                className="rounded-md border border-slate-200 px-3 py-1.5 font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {selectedBookingId && (
        <BookingDetailModal
          bookingId={selectedBookingId}
          onClose={() => setSelectedBookingId(null)}
        />
      )}
    </div>
  );
}
