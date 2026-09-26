"use client";

import { AlertCircle, CalendarRange, Search, Wallet, FileSpreadsheet, FileText } from "lucide-react";
import { useMemo, useState } from "react";

import { apiClient } from "@/lib/api-client";
import { BookingDetailModal } from "@/components/dashboard/booking-detail-modal";
import { SourceLogo } from "@/components/source-logo";

import { StatusBadge } from "@/components/status-badge";
import { FilterBar, FilterField } from "@/components/ui/filter-bar";
import { nightsBetween } from "@/lib/date-utils";
import { useBookingsList } from "@/lib/hooks/use-bookings";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import type { BookingStatus } from "@/lib/types";
import { cn } from "@/lib/cn";

const STATUS_OPTIONS: { value: BookingStatus | ""; label: string }[] = [
  { value: "", label: "All statuses" },
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "CHECKED_IN", label: "Checked In" },
  { value: "CHECKED_OUT", label: "Checked Out" },
  { value: "CANCELLED", label: "Cancelled" },
];



function formatCurrency(value: string | number): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  return `Rs. ${num.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export default function BookingsPage() {
  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState<BookingStatus | "">("");
  const [checkInFrom, setCheckInFrom] = useState("");
  const [checkInTo, setCheckInTo] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [ordering, setOrdering] = useState("-check_in");
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(
    null,
  );

  const debouncedSearch = useDebouncedValue(searchInput);

  const { data, isPending, isError } = useBookingsList({
    search: debouncedSearch,
    status: statusFilter,
    checkInFrom,
    checkInTo,
    page,
    pageSize,
    ordering,
  });

  const totalPages = data ? Math.max(1, Math.ceil(data.count / pageSize)) : 1;

  const pageStats = useMemo(() => {
    if (!data) return { revenue: 0, balanceDue: 0 };
    return data.results.reduce(
      (acc, b) => ({
        revenue: acc.revenue + parseFloat(b.total_amount),
        balanceDue: acc.balanceDue + parseFloat(b.balance_due),
      }),
      { revenue: 0, balanceDue: 0 },
    );
  }, [data]);

  function handleSearchChange(value: string) {
    setSearchInput(value);
    setPage(1);
  }

  function handleStatusChange(value: BookingStatus | "") {
    setStatusFilter(value);
    setPage(1);
  }

  function handleClearFilters() {
    setSearchInput("");
    setStatusFilter("");
    setCheckInFrom("");
    setCheckInTo("");
    setOrdering("-check_in");
    setPage(1);
  }

  const handleExport = async (format: "excel" | "pdf") => {
    try {
      const response = await apiClient.get("/bookings/export/", {
        params: {
          search: searchInput || undefined,
          status: statusFilter || undefined,
          check_in_from: checkInFrom || undefined,
          check_in_to: checkInTo || undefined,
          ordering: ordering || undefined,
          format,
        },
        responseType: "blob",
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `bookings.${format === "excel" ? "xlsx" : "pdf"}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Export failed:", error);
    }
  };

  const hasActiveFilters = Boolean(
    searchInput || statusFilter || checkInFrom || checkInTo || ordering !== "-check_in",
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Bookings</h1>
          <p className="mt-1 text-sm text-slate-500">
            Search and review historical and active reservations.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleExport("excel")}
            className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Excel
          </button>
          <button
            onClick={() => handleExport("pdf")}
            className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2"
          >
            <FileText className="h-4 w-4" />
            PDF
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <SummaryTile
          icon={CalendarRange}
          label="Bookings on this page"
          value={isPending ? "…" : String(data?.count ?? 0)}
          accent="bg-blue-100 text-blue-700"
        />
        <SummaryTile
          icon={Wallet}
          label="Revenue (page)"
          value={isPending ? "…" : formatCurrency(pageStats.revenue)}
          accent="bg-emerald-100 text-emerald-700"
        />
        <SummaryTile
          icon={AlertCircle}
          label="Balance due (page)"
          value={isPending ? "…" : formatCurrency(pageStats.balanceDue)}
          accent="bg-amber-100 text-amber-700"
        />
      </div>

      <FilterBar onClear={hasActiveFilters ? handleClearFilters : undefined}>
        <FilterField label="Search">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={searchInput}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Guest name or phone..."
              className="input w-full sm:w-56 pl-9"
            />
          </div>
        </FilterField>

        <FilterField label="Status">
          <select
            value={statusFilter}
            onChange={(e) =>
              handleStatusChange(e.target.value as BookingStatus | "")
            }
            className="input w-auto"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </FilterField>

        <FilterField label="Check-in range">
          <div className="flex items-center gap-1.5">
            <input
              type="date"
              value={checkInFrom}
              onChange={(e) => {
                setCheckInFrom(e.target.value);
                setPage(1);
              }}
              className="input w-auto"
            />
            <span className="text-xs text-slate-400">to</span>
            <input
              type="date"
              value={checkInTo}
              onChange={(e) => {
                setCheckInTo(e.target.value);
                setPage(1);
              }}
              className="input w-auto"
            />
          </div>
        </FilterField>

        <FilterField label="Sort By">
          <select
            value={ordering}
            onChange={(e) => {
              setOrdering(e.target.value);
              setPage(1);
            }}
            className="input w-auto"
          >
            <option value="-check_in">Check-in Date (Newest first)</option>
            <option value="check_in">Check-in Date (Oldest first)</option>
            <option value="-created_at">Booking Date (Newest first)</option>
            <option value="created_at">Booking Date (Oldest first)</option>
          </select>
        </FilterField>
      </FilterBar>

      {/* ── Mobile: card list (hidden on md+) ── */}
      <div className="space-y-3 md:hidden">
        {isPending && (
          <div className="rounded-lg border border-slate-200 bg-white px-4 py-8 text-center text-slate-500 shadow-sm">
            Loading bookings...
          </div>
        )}
        {isError && (
          <div className="rounded-lg border border-slate-200 bg-white px-4 py-8 text-center text-red-600 shadow-sm">
            Failed to load bookings. Please try again.
          </div>
        )}
        {!isPending && !isError && data?.results.length === 0 && (
          <div className="rounded-lg border border-slate-200 bg-white px-4 py-8 text-center text-slate-400 shadow-sm">
            No bookings match your filters.
          </div>
        )}
        {data?.results.map((booking) => {
          const balanceDue = parseFloat(booking.balance_due);
          const nights = nightsBetween(booking.check_in, booking.check_out);
          return (
            <div
              key={booking.id}
              onClick={() => setSelectedBookingId(booking.id)}
              className="cursor-pointer rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:bg-slate-50 active:bg-slate-100"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
                    {initials(booking.guest.name)}
                  </span>
                  <div>
                    <div className="font-medium text-slate-900">{booking.guest.name}</div>
                    <div className="text-xs text-slate-400">{booking.guest.phone}</div>
                  </div>
                </div>
                <StatusBadge status={booking.status} />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm">
                <div>
                  <p className="text-xs text-slate-400">Room No.</p>
                  <p className="font-medium text-slate-700">
                    {booking.allocated_rooms.map((r) => r.room_number).join(", ") || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Source</p>
                  <SourceLogo source={booking.source} size="xs" withLabel />
                </div>
                <div>
                  <p className="text-xs text-slate-400">Stay</p>
                  <p className="font-medium text-slate-700">
                    {booking.check_in} → {booking.check_out}
                  </p>
                  <p className="text-xs text-slate-400">
                    {nights} night{nights === 1 ? "" : "s"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Total</p>
                  <p className="font-medium text-slate-900">
                    {formatCurrency(booking.total_amount)}
                  </p>
                  <p className={cn("text-xs font-medium", balanceDue > 0 ? "text-red-600" : "text-emerald-600")}>
                    Balance: {formatCurrency(booking.balance_due)}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
        {data && data.count > 0 && (
          <div className="flex items-center justify-between py-2 text-sm text-slate-500">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
              <select 
                value={pageSize} 
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600 focus:outline-none focus:ring-1 focus:ring-slate-900"
              >
                <option value={10}>10 / page</option>
                <option value={20}>20 / page</option>
                <option value={50}>50 / page</option>
                <option value={100}>100 / page</option>
              </select>
              <span>
                {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, data.count)} of {data.count}
              </span>
            </div>
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
                disabled={page >= totalPages}
                className="rounded-md border border-slate-200 px-3 py-1.5 font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Desktop: table (hidden below md) ── */}
      <div className="hidden overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm md:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3">Guest</th>
                <th className="px-4 py-3">Room No.</th>
                <th className="px-4 py-3">Stay</th>
                <th className="px-4 py-3">Source</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3 text-right">Balance</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isPending && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                    Loading bookings...
                  </td>
                </tr>
              )}
              {isError && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-red-600">
                    Failed to load bookings. Please try again.
                  </td>
                </tr>
              )}
              {!isPending && !isError && data?.results.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                    No bookings match your filters.
                  </td>
                </tr>
              )}
              {data?.results.map((booking) => {
                const balanceDue = parseFloat(booking.balance_due);
                const nights = nightsBetween(booking.check_in, booking.check_out);
                return (
                  <tr
                    key={booking.id}
                    onClick={() => setSelectedBookingId(booking.id)}
                    className="cursor-pointer transition hover:bg-slate-50"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
                          {initials(booking.guest.name)}
                        </span>
                        <div>
                          <div className="font-medium text-slate-900">
                            {booking.guest.name}
                          </div>
                          <div className="text-xs text-slate-400">
                            {booking.guest.phone}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {booking.allocated_rooms
                        .map((r) => r.room_number)
                        .join(", ")}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      <div>
                        {booking.check_in} &rarr; {booking.check_out}
                      </div>
                      <div className="text-xs text-slate-400">
                        {nights} night{nights === 1 ? "" : "s"}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <SourceLogo source={booking.source} size="xs" withLabel />
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-slate-900">
                      {formatCurrency(booking.total_amount)}
                    </td>
                    <td className="px-4 py-3 text-right font-medium">
                      <span
                        className={cn(
                          balanceDue > 0 ? "text-red-600" : "text-emerald-600",
                        )}
                      >
                        {formatCurrency(booking.balance_due)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={booking.status} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {data && data.count > 0 && (
          <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-sm text-slate-500">
            <div className="flex items-center gap-4">
              <span>
                Showing {(page - 1) * pageSize + 1}
                &ndash;
                {Math.min(page * pageSize, data.count)} of {data.count}
              </span>
              <div className="flex items-center gap-2">
                <span>Rows:</span>
                <select 
                  value={pageSize} 
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(1);
                  }}
                  className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600 focus:outline-none focus:ring-1 focus:ring-slate-900"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>
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
                disabled={page >= totalPages}
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

function SummaryTile({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <span
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
          accent,
        )}
      >
        <Icon className="h-4.5 w-4.5" />
      </span>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-slate-900">{value}</p>
        <p className="text-xs text-slate-500">{label}</p>
      </div>
    </div>
  );
}
