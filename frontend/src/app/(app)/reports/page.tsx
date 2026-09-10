"use client";

import { Printer } from "lucide-react";
import { useState } from "react";

import {
  addDays,
  endOfMonth,
  getCurrentMonthRange,
  startOfMonth,
  startOfDay,
  toDateOnly,
} from "@/lib/date-utils";
import {
  EXPENSE_CATEGORIES,
  EXPENSE_CATEGORY_DOT,
  EXPENSE_CATEGORY_LABELS,
} from "@/lib/expense-categories";
import { useFinancialSummaryReport, useOccupancyReport } from "@/lib/hooks/use-reports";
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

export default function ReportsPage() {
  const [from, setFrom] = useState(DEFAULT_RANGE.from);
  const [to, setTo] = useState(DEFAULT_RANGE.to);

  const financial = useFinancialSummaryReport(from, to);
  const occupancy = useOccupancyReport(from, to);

  function applyPreset(getRange: () => { from: string; to: string }) {
    const range = getRange();
    setFrom(range.from);
    setTo(range.to);
  }

  return (
    <div className="space-y-6 print:space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-4 print:block">
        <div>
          <h1 className="text-lg font-semibold text-slate-900 print:text-black">
            Reports
          </h1>
          <p className="mt-1 text-sm text-slate-500 print:hidden">
            Financial summary and occupancy for the selected date range.
          </p>
          <p className="mt-1 hidden text-sm text-black print:block">
            {from} to {to}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 print:hidden">
          {PRESETS.map((preset) => (
            <button
              key={preset.label}
              onClick={() => applyPreset(preset.getRange)}
              className="rounded-md border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              {preset.label}
            </button>
          ))}
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="input w-auto"
          />
          <span className="text-sm text-slate-400">to</span>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="input w-auto"
          />
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800"
          >
            <Printer className="h-4 w-4" />
            Print Report
          </button>
        </div>
      </div>

      <FinancialSummarySection
        data={financial.data}
        isPending={financial.isPending}
        isError={financial.isError}
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
}: {
  data: ReturnType<typeof useFinancialSummaryReport>["data"];
  isPending: boolean;
  isError: boolean;
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

          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm print:border-black print:shadow-none">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 print:text-black">
              Expenses by Category
            </h3>
            <ul className="divide-y divide-slate-100 print:divide-black/20">
              {EXPENSE_CATEGORIES.map((category) => (
                <li
                  key={category}
                  className="flex items-center justify-between py-2 text-sm"
                >
                  <span className="flex items-center gap-2 text-slate-600 print:text-black">
                    <span
                      className={cn(
                        "h-2 w-2 rounded-full print:hidden",
                        EXPENSE_CATEGORY_DOT[category],
                      )}
                    />
                    {EXPENSE_CATEGORY_LABELS[category]}
                  </span>
                  <span className="font-medium text-slate-900 print:text-black">
                    {formatCurrency(data.expenses_by_category[category] ?? 0)}
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
