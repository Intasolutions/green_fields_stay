"use client";

import { Download, Printer } from "lucide-react";
import { useState } from "react";

import { RequireRole } from "@/components/require-role";
import { SourceLogo } from "@/components/source-logo";
import { useToast } from "@/components/ui/toast";
import { FilterBar, FilterField } from "@/components/ui/filter-bar";
import {
  addDays,
  endOfMonth,
  getCurrentMonthRange,
  startOfMonth,
  startOfDay,
  toDateOnly,
} from "@/lib/date-utils";
import { downloadCsv } from "@/lib/csv-export";
import { expenseCategoryDotColor } from "@/lib/expense-category-colors";
import { useExpenseCategories } from "@/lib/hooks/use-expenses";
import { PAYMENT_METHODS, PAYMENT_METHOD_LABELS } from "@/lib/payment-methods";
import { BOOKING_SOURCES } from "@/lib/source-colors";
import {
  useFinancialSummaryReport,
  useOccupancyReport,
} from "@/lib/hooks/use-reports";
import type { ExpenseCategory, FinancialSummaryReport, OccupancyReport } from "@/lib/types";
import { cn } from "@/lib/cn";

const DEFAULT_RANGE = getCurrentMonthRange();

const PRESETS = [
  {
    label: "Today",
    getRange: () => {
      const today = toDateOnly(startOfDay(new Date()));
      return { from: today, to: today };
    },
  },
  {
    label: "This Week",
    getRange: () => {
      const now = startOfDay(new Date());
      const dayOfWeek = now.getDay();
      const monday = addDays(now, dayOfWeek === 0 ? -6 : 1 - dayOfWeek);
      return { from: toDateOnly(monday), to: toDateOnly(addDays(monday, 6)) };
    },
  },
  {
    label: "This Month",
    getRange: () => {
      const now = new Date();
      return {
        from: toDateOnly(startOfMonth(now)),
        to: toDateOnly(endOfMonth(now)),
      };
    },
  },
];

function formatCurrency(value: number): string {
  return `Rs. ${value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function buildReportCsvRows(
  financial: FinancialSummaryReport,
  occupancy: OccupancyReport,
  categories: ExpenseCategory[],
): (string | number)[][] {
  const rows: (string | number)[][] = [
    ["Report Period", `${financial.from} to ${financial.to}`],
    [],
    ["Financial Summary", ""],
    ["Total Revenue", financial.total_booking_revenue],
    ["OTA Commissions", financial.total_ota_commissions],
    ["Net Payout", financial.total_net_payout],
    ["Total Expenses", financial.total_expenses],
    ["Net Profit", financial.net_profit],
    ["Bookings", financial.booking_count],
    ["Average Booking Value", financial.average_booking_value],
    ["Cancelled Bookings", financial.cancelled_count],
    [],
    ["Bookings by Source", "Count", "Revenue"],
    ...BOOKING_SOURCES.map((source) => [
      source,
      financial.bookings_by_source[source] ?? 0,
      financial.revenue_by_source[source] ?? 0,
    ]),
    [],
    ["Payments by Method", "Amount"],
    ...PAYMENT_METHODS.map((method) => [
      PAYMENT_METHOD_LABELS[method],
      financial.payments_by_method[method] ?? 0,
    ]),
    [],
    ["Expenses by Category", "Amount"],
    ...categories.map((category) => [
      category.name,
      financial.expenses_by_category[category.name] ?? 0,
    ]),
    [],
    ["Occupancy", ""],
    ["Lodge-wide Occupancy %", occupancy.occupancy_percentage],
    ["Room-Nights Sold", occupancy.total_room_nights_sold],
    ["Days in Range", occupancy.number_of_days],
    [],
    ["Room", "Nights Booked", "Occupancy %"],
    ...occupancy.rooms.map((room) => [
      `Room ${room.room_number}`,
      room.nights_booked,
      room.occupancy_percentage,
    ]),
  ];

  return rows;
}

export default function ReportsPage() {
  return (
    <RequireRole allowedRoles={["ADMIN"]}>
      <ReportsPageContent />
    </RequireRole>
  );
}

function ReportsPageContent() {
  const [from, setFrom] = useState(DEFAULT_RANGE.from);
  const [to, setTo] = useState(DEFAULT_RANGE.to);
  const { showToast } = useToast();

  const financial = useFinancialSummaryReport(from, to);
  const occupancy = useOccupancyReport(from, to);
  const { data: categories } = useExpenseCategories();

  function applyPreset(getRange: () => { from: string; to: string }) {
    const range = getRange();
    setFrom(range.from);
    setTo(range.to);
  }

  function handleDownloadCsv() {
    if (!financial.data || !occupancy.data) return;
    const rows = buildReportCsvRows(financial.data, occupancy.data, categories ?? []);
    downloadCsv(`report_${from}_to_${to}.csv`, rows);
    showToast("Report exported.");
  }

  return (
    <div className="space-y-5 print:space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Reports</h1>
          <p className="mt-1 text-sm text-slate-500">
            Financial summary and occupancy for the selected date range.
          </p>
        </div>
      </div>

      <p className="hidden text-sm text-black print:block">
        Report period: {from} to {to}
      </p>

      <FilterBar className="print:hidden">
        {PRESETS.map((preset) => (
          <button
            key={preset.label}
            onClick={() => applyPreset(preset.getRange)}
            className="rounded-md border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            {preset.label}
          </button>
        ))}

        <FilterField label="Date range">
          <div className="flex items-center gap-1.5">
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="input w-auto"
            />
            <span className="text-xs text-slate-400">to</span>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="input w-auto"
            />
          </div>
        </FilterField>

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={handleDownloadCsv}
            disabled={!financial.data || !occupancy.data}
            className="flex items-center gap-1.5 rounded-md border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            CSV
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800"
          >
            <Printer className="h-4 w-4" />
            Print / PDF
          </button>
        </div>
      </FilterBar>

      <FinancialSummarySection
        data={financial.data}
        isPending={financial.isPending}
        isError={financial.isError}
        categories={categories ?? []}
      />

      <OccupancySection
        data={occupancy.data}
        isPending={occupancy.isPending}
        isError={occupancy.isError}
      />
    </div>
  );
}

function FinancialSummarySection({
  data,
  isPending,
  isError,
  categories,
}: {
  data: ReturnType<typeof useFinancialSummaryReport>["data"];
  isPending: boolean;
  isError: boolean;
  categories: ExpenseCategory[];
}) {
  return (
    <section className="print:break-inside-avoid">
      <h2 className="mb-3 text-sm font-semibold text-slate-700 print:text-black">
        Financial Summary
      </h2>

      {isPending && (
        <p className="text-sm text-slate-500">Loading financial summary...</p>
      )}
      {isError && (
        <p className="text-sm text-red-600">
          Failed to load the financial summary report.
        </p>
      )}

      {data && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5 print:grid-cols-5 print:gap-2">
            <StatTile
              label="Total Revenue"
              value={formatCurrency(data.total_booking_revenue)}
            />
            <StatTile
              label="OTA Commissions"
              value={formatCurrency(data.total_ota_commissions)}
            />
            <StatTile
              label="Net Payout"
              value={formatCurrency(data.total_net_payout)}
            />
            <StatTile
              label="Total Expenses"
              value={formatCurrency(data.total_expenses)}
            />
            <StatTile
              label="Net Profit"
              value={formatCurrency(data.net_profit)}
              emphasis={data.net_profit >= 0 ? "positive" : "negative"}
            />
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 print:grid-cols-3 print:gap-2">
            <StatTile label="Bookings" value={String(data.booking_count)} />
            <StatTile
              label="Avg. Booking Value"
              value={formatCurrency(data.average_booking_value)}
            />
            <StatTile
              label="Cancelled Bookings"
              value={String(data.cancelled_count)}
              emphasis={data.cancelled_count > 0 ? "negative" : undefined}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 print:grid-cols-2">
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm print:border-black print:shadow-none">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 print:text-black">
                Bookings by Source
              </h3>
              <ul className="divide-y divide-slate-100 print:divide-black/20">
                {BOOKING_SOURCES.map((source) => {
                  const count = data.bookings_by_source[source] ?? 0;
                  const revenue = data.revenue_by_source[source] ?? 0;
                  return (
                    <li
                      key={source}
                      className="flex items-center justify-between py-2 text-sm"
                    >
                      <span className="flex items-center gap-2 text-slate-600 print:text-black">
                        <SourceLogo source={source} size="xs" withLabel />
                        <span className="text-xs text-slate-400 print:text-black">
                          &times;{count}
                        </span>
                      </span>
                      <span className="font-medium text-slate-900 print:text-black">
                        {formatCurrency(revenue)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm print:border-black print:shadow-none">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 print:text-black">
                Payments Collected by Method
              </h3>
              <ul className="divide-y divide-slate-100 print:divide-black/20">
                {PAYMENT_METHODS.map((method) => (
                  <li
                    key={method}
                    className="flex items-center justify-between py-2 text-sm"
                  >
                    <span className="text-slate-600 print:text-black">
                      {PAYMENT_METHOD_LABELS[method]}
                    </span>
                    <span className="font-medium text-slate-900 print:text-black">
                      {formatCurrency(data.payments_by_method[method] ?? 0)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm print:border-black print:shadow-none">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 print:text-black">
              Expenses by Category
            </h3>
            {categories.length === 0 ? (
              <p className="text-sm text-slate-400">No categories yet.</p>
            ) : (
              <ul className="divide-y divide-slate-100 print:divide-black/20">
                {categories.map((category) => (
                  <li
                    key={category.id}
                    className="flex items-center justify-between py-2 text-sm"
                  >
                    <span className="flex items-center gap-2 text-slate-600 print:text-black">
                      <span
                        className={cn(
                          "h-2 w-2 rounded-full print:hidden",
                          expenseCategoryDotColor(category.id),
                        )}
                      />
                      {category.name}
                    </span>
                    <span className="font-medium text-slate-900 print:text-black">
                      {formatCurrency(data.expenses_by_category[category.name] ?? 0)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

function OccupancySection({
  data,
  isPending,
  isError,
}: {
  data: ReturnType<typeof useOccupancyReport>["data"];
  isPending: boolean;
  isError: boolean;
}) {
  return (
    <section className="print:break-inside-avoid">
      <h2 className="mb-3 text-sm font-semibold text-slate-700 print:text-black">
        Occupancy
      </h2>

      {isPending && (
        <p className="text-sm text-slate-500">Loading occupancy report...</p>
      )}
      {isError && (
        <p className="text-sm text-red-600">
          Failed to load the occupancy report.
        </p>
      )}

      {data && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 print:grid-cols-3 print:gap-2">
            <StatTile
              label="Lodge-wide Occupancy"
              value={`${data.occupancy_percentage}%`}
            />
            <StatTile
              label="Room-Nights Sold"
              value={String(data.total_room_nights_sold)}
            />
            <StatTile label="Days in Range" value={String(data.number_of_days)} />
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm print:border-black print:shadow-none">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500 print:text-black">
              Room Performance
            </h3>
            <ul className="space-y-2">
              {data.rooms.map((room) => (
                <li key={room.room_number} className="flex items-center gap-3">
                  <span className="w-16 shrink-0 text-sm font-medium text-slate-700 print:text-black">
                    Room {room.room_number}
                  </span>
                  <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100 print:border print:border-black print:bg-white">
                    <div
                      className="h-full rounded-full bg-slate-900 print:bg-black"
                      style={{
                        width: `${Math.min(room.occupancy_percentage, 100)}%`,
                      }}
                    />
                  </div>
                  <span className="w-28 shrink-0 text-right text-xs text-slate-500 print:text-black">
                    {room.nights_booked} nights &middot;{" "}
                    {room.occupancy_percentage}%
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </section>
  );
}

function StatTile({
  label,
  value,
  emphasis,
}: {
  label: string;
  value: string;
  emphasis?: "positive" | "negative";
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm print:border-black print:p-2 print:shadow-none">
      <p className="text-xs text-slate-500 print:text-black">{label}</p>
      <p
        className={cn(
          "mt-1 text-lg font-semibold tabular-nums text-slate-900 print:text-black",
          emphasis === "positive" && "text-emerald-600 print:text-black",
          emphasis === "negative" && "text-red-600 print:text-black",
        )}
      >
        {value}
      </p>
    </div>
  );
}
