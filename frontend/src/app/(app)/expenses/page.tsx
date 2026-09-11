"use client";

import {
  Download,
  Plus,
  Printer,
  Receipt,
  Settings,
  Wallet,
  Wrench,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";

import { getApiErrorMessage } from "@/lib/api-error";
import { getCurrentMonthRange, toDateOnly } from "@/lib/date-utils";
import { downloadCsv } from "@/lib/csv-export";
import { expenseCategoryDotColor } from "@/lib/expense-category-colors";
import {
  fetchAllExpenses,
  useCreateExpense,
  useCreateExpenseCategory,
  useExpenseCategories,
  useExpensesList,
  useUpdateExpenseCategory,
} from "@/lib/hooks/use-expenses";
import { useCurrentUser } from "@/lib/hooks/use-current-user";
import type { ExpenseCategory } from "@/lib/types";
import { cn } from "@/lib/cn";
import { useToast } from "@/components/ui/toast";
import { RequireRole } from "@/components/require-role";
import { FilterBar, FilterField } from "@/components/ui/filter-bar";

const PAGE_SIZE = 15;
const DEFAULT_RANGE = getCurrentMonthRange();

function formatCurrency(value: string | number): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  return `Rs. ${num.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function ExpensesPage() {
  return (
    <RequireRole allowedRoles={["MANAGER", "ADMIN"]}>
      <ExpensesPageContent />
    </RequireRole>
  );
}

function ExpensesPageContent() {
  const { data: currentUser } = useCurrentUser();
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [fromDate, setFromDate] = useState(DEFAULT_RANGE.from);
  const [toDate, setToDate] = useState(DEFAULT_RANGE.to);
  const [categoryFilter, setCategoryFilter] = useState<number | "">("");
  const [page, setPage] = useState(1);

  const { data: categories } = useExpenseCategories();
  const { data, isPending, isError, isPlaceholderData } = useExpensesList({
    category: categoryFilter,
    fromDate,
    toDate,
    page,
    pageSize: PAGE_SIZE,
  });

  const isAdmin = currentUser?.role === "ADMIN";

  return (
    <div className="space-y-5 print:space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Expenses</h1>
          <p className="mt-1 text-sm text-slate-500">
            Track labor, contractor wages, materials, and other running costs.
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowCategoryManager(true)}
            className="flex items-center gap-1.5 rounded-md border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            <Settings className="h-4 w-4" />
            Manage Categories
          </button>
        )}
      </div>

      <ExpenseSummaryCards data={data} isPending={isPending} />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[360px_1fr] print:block">
        <div className="print:hidden">
          <NewExpenseForm categories={categories ?? []} />
        </div>
        <RecentExpensesFeed
          categories={categories ?? []}
          fromDate={fromDate}
          toDate={toDate}
          categoryFilter={categoryFilter}
          page={page}
          onFromDateChange={(v) => {
            setFromDate(v);
            setPage(1);
          }}
          onToDateChange={(v) => {
            setToDate(v);
            setPage(1);
          }}
          onCategoryFilterChange={(v) => {
            setCategoryFilter(v);
            setPage(1);
          }}
          onPageChange={setPage}
          data={data}
          isPending={isPending}
          isError={isError}
          isPlaceholderData={isPlaceholderData}
        />
      </div>

      {showCategoryManager && (
        <CategoryManagerModal
          categories={categories ?? []}
          onClose={() => setShowCategoryManager(false)}
        />
      )}
    </div>
  );
}

function ExpenseSummaryCards({
  data,
  isPending,
}: {
  data: ReturnType<typeof useExpensesList>["data"];
  isPending: boolean;
}) {
  const totalThisPage = useMemo(() => {
    if (!data) return 0;
    return data.results.reduce((sum, e) => sum + parseFloat(e.amount), 0);
  }, [data]);

  const topCategory = useMemo(() => {
    if (!data || data.results.length === 0) return null;
    const totals = new Map<string, number>();
    for (const e of data.results) {
      const name = e.category_detail.name;
      totals.set(name, (totals.get(name) ?? 0) + parseFloat(e.amount));
    }
    let best: [string, number] | null = null;
    for (const entry of totals) {
      if (!best || entry[1] > best[1]) best = entry;
    }
    return best;
  }, [data]);

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 print:hidden">
      <SummaryCard
        icon={Wallet}
        label="Shown on this page"
        value={isPending ? "…" : formatCurrency(totalThisPage)}
        accent="bg-blue-100 text-blue-700"
      />
      <SummaryCard
        icon={Receipt}
        label="Entries in range"
        value={isPending ? "…" : String(data?.count ?? 0)}
        accent="bg-emerald-100 text-emerald-700"
      />
      <SummaryCard
        icon={Wrench}
        label="Top category (page)"
        value={isPending ? "…" : topCategory ? topCategory[0] : "—"}
        accent="bg-amber-100 text-amber-700"
      />
    </div>
  );
}

function SummaryCard({
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
      <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full", accent)}>
        <Icon className="h-4.5 w-4.5" />
      </span>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-slate-900">{value}</p>
        <p className="text-xs text-slate-500">{label}</p>
      </div>
    </div>
  );
}

function NewExpenseForm({ categories }: { categories: ExpenseCategory[] }) {
  const createExpense = useCreateExpense();
  const { showToast } = useToast();

  const activeCategories = categories.filter((c) => c.is_active);
  const [date, setDate] = useState(toDateOnly(new Date()));
  const [categoryId, setCategoryId] = useState<number | "">("");
  const [jobDetails, setJobDetails] = useState("");
  const [workerCount, setWorkerCount] = useState("");
  const [paidTo, setPaidTo] = useState("");
  const [amount, setAmount] = useState("");
  const [materialsPurchased, setMaterialsPurchased] = useState("");
  const [error, setError] = useState<string | null>(null);

  const selectedCategory = activeCategories.find((c) => c.id === categoryId);
  const showWorkerCount = selectedCategory?.tracks_worker_count ?? false;
  const showMaterialsPurchased = selectedCategory?.tracks_materials ?? false;

  function handleCategoryChange(next: number) {
    setCategoryId(next);
    const category = activeCategories.find((c) => c.id === next);
    if (!category?.tracks_worker_count) setWorkerCount("");
    if (!category?.tracks_materials) setMaterialsPurchased("");
  }

  function resetForm() {
    setJobDetails("");
    setWorkerCount("");
    setPaidTo("");
    setAmount("");
    setMaterialsPurchased("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!categoryId) {
      setError("Select a category.");
      return;
    }
    if (!jobDetails.trim() || !paidTo.trim()) {
      setError("Job details and paid-to are required.");
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      setError("Enter a valid amount.");
      return;
    }
    if (showWorkerCount && workerCount && parseInt(workerCount, 10) <= 0) {
      setError("Worker count must be at least 1.");
      return;
    }

    try {
      await createExpense.mutateAsync({
        date,
        category: categoryId,
        job_details: jobDetails.trim(),
        worker_count:
          showWorkerCount && workerCount ? parseInt(workerCount, 10) : null,
        paid_to: paidTo.trim(),
        amount,
        materials_purchased:
          showMaterialsPurchased && materialsPurchased.trim()
            ? materialsPurchased.trim()
            : null,
      });
      resetForm();
      showToast("Expense recorded.");
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not record expense."));
    }
  }

  return (
    <div className="h-fit rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-sm font-semibold text-slate-700">
        Record New Expense
      </h2>

      <form onSubmit={handleSubmit} className="space-y-3">
        <Field label="Date" required>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="input"
            required
          />
        </Field>

        <Field label="Category" required>
          <select
            value={categoryId}
            onChange={(e) => handleCategoryChange(Number(e.target.value))}
            className="input"
            required
          >
            <option value="" disabled>
              Select a category
            </option>
            {activeCategories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
          {activeCategories.length === 0 && (
            <p className="mt-1 text-xs text-amber-600">
              No categories yet — ask an Admin to add one.
            </p>
          )}
        </Field>

        <Field label="Job Details" required>
          <input
            value={jobDetails}
            onChange={(e) => setJobDetails(e.target.value)}
            placeholder="e.g. Roof repair, electricity bill"
            className="input"
            required
          />
        </Field>

        {showWorkerCount && (
          <Field label="Worker Count">
            <input
              type="number"
              min="1"
              value={workerCount}
              onChange={(e) => setWorkerCount(e.target.value)}
              placeholder="e.g. 3"
              className="input"
            />
          </Field>
        )}

        {showMaterialsPurchased && (
          <Field label="Materials Purchased">
            <input
              value={materialsPurchased}
              onChange={(e) => setMaterialsPurchased(e.target.value)}
              placeholder="e.g. Roof sheets, railing"
              className="input"
            />
          </Field>
        )}

        <Field label="Paid To" required>
          <input
            value={paidTo}
            onChange={(e) => setPaidTo(e.target.value)}
            placeholder="e.g. Vendor name"
            className="input"
            required
          />
        </Field>

        <Field label="Amount (Rs.)" required>
          <input
            type="number"
            min="0"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="input"
            required
          />
        </Field>

        {error && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={createExpense.isPending}
          className="w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
        >
          {createExpense.isPending ? "Saving..." : "Record Expense"}
        </button>
      </form>
    </div>
  );
}

function RecentExpensesFeed({
  categories,
  fromDate,
  toDate,
  categoryFilter,
  page,
  onFromDateChange,
  onToDateChange,
  onCategoryFilterChange,
  onPageChange,
  data,
  isPending,
  isError,
  isPlaceholderData,
}: {
  categories: ExpenseCategory[];
  fromDate: string;
  toDate: string;
  categoryFilter: number | "";
  page: number;
  onFromDateChange: (v: string) => void;
  onToDateChange: (v: string) => void;
  onCategoryFilterChange: (v: number | "") => void;
  onPageChange: (updater: (p: number) => number) => void;
  data: ReturnType<typeof useExpensesList>["data"];
  isPending: boolean;
  isError: boolean;
  isPlaceholderData: boolean;
}) {
  const { showToast } = useToast();
  const [isExporting, setIsExporting] = useState(false);

  const totalPages = data ? Math.max(1, Math.ceil(data.count / PAGE_SIZE)) : 1;
  const hasActiveFilters = categoryFilter !== "";

  async function handleExportCsv() {
    setIsExporting(true);
    try {
      const rows: (string | number)[][] = [
        [
          "Date",
          "Category",
          "Job Details",
          "Worker Count",
          "Paid To",
          "Amount",
          "Materials Purchased",
        ],
      ];

      const allExpenses = await fetchAllExpenses({
        category: categoryFilter,
        fromDate,
        toDate,
      });
      for (const expense of allExpenses) {
        rows.push([
          expense.date,
          expense.category_detail.name,
          expense.job_details,
          expense.worker_count ?? "",
          expense.paid_to,
          expense.amount,
          expense.materials_purchased ?? "",
        ]);
      }

      downloadCsv(`expenses_${fromDate}_to_${toDate}.csv`, rows);
      showToast(`Exported ${allExpenses.length} expense(s).`);
    } catch {
      showToast("Could not export expenses.", "error");
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div className="space-y-3">
      <FilterBar
        className="print:hidden"
        onClear={hasActiveFilters ? () => onCategoryFilterChange("") : undefined}
      >
        <FilterField label="Date range">
          <div className="flex items-center gap-1.5">
            <input
              type="date"
              value={fromDate}
              onChange={(e) => onFromDateChange(e.target.value)}
              className="input w-auto"
            />
            <span className="text-xs text-slate-400">to</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => onToDateChange(e.target.value)}
              className="input w-auto"
            />
          </div>
        </FilterField>

        <FilterField label="Category">
          <select
            value={categoryFilter}
            onChange={(e) =>
              onCategoryFilterChange(
                e.target.value ? Number(e.target.value) : "",
              )
            }
            className="input w-auto"
          >
            <option value="">All categories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </FilterField>

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 rounded-md border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            <Printer className="h-4 w-4" />
            PDF
          </button>
          <button
            onClick={handleExportCsv}
            disabled={isExporting || !data || data.count === 0}
            className="flex items-center gap-1.5 rounded-md border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            {isExporting ? "Exporting..." : "CSV"}
          </button>
        </div>
      </FilterBar>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm print:border-black print:shadow-none">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3 print:border-black">
          <h2 className="text-sm font-semibold text-slate-700 print:text-black">
            Expenses
          </h2>
          <span className="hidden text-xs text-black print:block">
            {fromDate} to {toDate}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500 print:text-black">
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Details</th>
                <th className="px-4 py-3">Paid To</th>
                <th className="px-4 py-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isPending && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                    Loading expenses...
                  </td>
                </tr>
              )}
              {isError && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-red-600">
                    Failed to load expenses.
                  </td>
                </tr>
              )}
              {!isPending && !isError && data?.results.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                    No expenses recorded for this range.
                  </td>
                </tr>
              )}
              {data?.results.map((expense) => (
                <tr key={expense.id}>
                  <td className="px-4 py-3 whitespace-nowrap text-slate-600 print:text-black">
                    {expense.date}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1.5 text-slate-600 print:text-black">
                      <span
                        className={cn(
                          "h-2 w-2 rounded-full print:hidden",
                          expenseCategoryDotColor(expense.category),
                        )}
                      />
                      {expense.category_detail.name}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600 print:text-black">
                    <div>{expense.job_details}</div>
                    {expense.worker_count != null && (
                      <div className="text-xs text-slate-400 print:text-black">
                        {expense.worker_count} worker
                        {expense.worker_count === 1 ? "" : "s"}
                      </div>
                    )}
                    {expense.materials_purchased && (
                      <div className="text-xs text-slate-400 print:text-black">
                        {expense.materials_purchased}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-600 print:text-black">
                    {expense.paid_to}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-slate-900 print:text-black">
                    {formatCurrency(expense.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {data && data.count > 0 && (
          <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-sm text-slate-500 print:hidden">
            <span>
              Showing {(page - 1) * PAGE_SIZE + 1}
              &ndash;
              {Math.min(page * PAGE_SIZE, data.count)} of {data.count}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => onPageChange((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="rounded-md border border-slate-200 px-3 py-1.5 font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Previous
              </button>
              <button
                onClick={() => onPageChange((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages || isPlaceholderData}
                className="rounded-md border border-slate-200 px-3 py-1.5 font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function CategoryManagerModal({
  categories,
  onClose,
}: {
  categories: ExpenseCategory[];
  onClose: () => void;
}) {
  const { showToast } = useToast();
  const createCategory = useCreateExpenseCategory();
  const updateCategory = useUpdateExpenseCategory();

  const [name, setName] = useState("");
  const [tracksWorkerCount, setTracksWorkerCount] = useState(false);
  const [tracksMaterials, setTracksMaterials] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Enter a category name.");
      return;
    }

    try {
      await createCategory.mutateAsync({
        name: name.trim(),
        tracks_worker_count: tracksWorkerCount,
        tracks_materials: tracksMaterials,
      });
      setName("");
      setTracksWorkerCount(false);
      setTracksMaterials(false);
      showToast("Category added.");
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not add category."));
    }
  }

  async function handleToggleActive(category: ExpenseCategory) {
    try {
      await updateCategory.mutateAsync({
        categoryId: category.id,
        is_active: !category.is_active,
      });
    } catch (err) {
      showToast(getApiErrorMessage(err, "Could not update category."), "error");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="text-base font-semibold text-slate-900">
            Manage Expense Categories
          </h2>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto px-5 py-4">
          <ul className="mb-4 divide-y divide-slate-100">
            {categories.map((category) => (
              <li
                key={category.id}
                className="flex items-center justify-between py-2.5"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "h-2 w-2 rounded-full",
                      expenseCategoryDotColor(category.id),
                    )}
                  />
                  <span className="text-sm font-medium text-slate-800">
                    {category.name}
                  </span>
                  {category.tracks_worker_count && (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                      tracks workers
                    </span>
                  )}
                  {category.tracks_materials && (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                      tracks materials
                    </span>
                  )}
                </div>
                <button
                  onClick={() => handleToggleActive(category)}
                  className={cn(
                    "rounded-md border px-2.5 py-1 text-xs font-medium",
                    category.is_active
                      ? "border-red-200 text-red-600 hover:bg-red-50"
                      : "border-emerald-200 text-emerald-600 hover:bg-emerald-50",
                  )}
                >
                  {category.is_active ? "Deactivate" : "Activate"}
                </button>
              </li>
            ))}
          </ul>

          <form
            onSubmit={handleAdd}
            className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Add a category
            </p>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Marketing"
              className="input"
            />
            <div className="flex flex-wrap gap-4 text-sm text-slate-600">
              <label className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={tracksWorkerCount}
                  onChange={(e) => setTracksWorkerCount(e.target.checked)}
                />
                Tracks worker count
              </label>
              <label className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={tracksMaterials}
                  onChange={(e) => setTracksMaterials(e.target.checked)}
                />
                Tracks materials purchased
              </label>
            </div>
            {error && (
              <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={createCategory.isPending}
              className="flex items-center gap-1.5 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
            >
              <Plus className="h-4 w-4" />
              {createCategory.isPending ? "Adding..." : "Add Category"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-500">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </span>
      {children}
    </label>
  );
}
