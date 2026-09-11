"use client";

import { useState } from "react";

import { getApiErrorMessage } from "@/lib/api-error";
import { toDateOnly } from "@/lib/date-utils";
import {
  EXPENSE_CATEGORIES,
  EXPENSE_CATEGORY_DOT,
  EXPENSE_CATEGORY_LABELS,
} from "@/lib/expense-categories";
import { useCreateExpense, useExpensesList } from "@/lib/hooks/use-expenses";
import type { ExpenseCategory } from "@/lib/types";
import { cn } from "@/lib/cn";
import { useToast } from "@/components/ui/toast";
import { RequireRole } from "@/components/require-role";

const PAGE_SIZE = 15;

export default function ExpensesPage() {
  return (
    <RequireRole allowedRoles={["MANAGER", "ADMIN"]}>
      <div className="space-y-4">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Expenses</h1>
          <p className="mt-1 text-sm text-slate-500">
            Track labor, contractor wages, and material purchases.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[380px_1fr]">
          <NewExpenseForm />
          <RecentExpensesFeed />
        </div>
      </div>
    </RequireRole>
  );
}

const JOB_DETAILS_PLACEHOLDER: Record<ExpenseCategory, string> = {
  LABOR: "e.g. 2 putty walls bedroom, roof repair",
  MATERIALS: "e.g. Cement, tiles, plumbing fixtures",
  UTILITIES: "e.g. Electricity bill, water bill",
  MAINTENANCE: "e.g. AC servicing, pest control",
  OTHER: "Brief description",
};

const PAID_TO_LABEL: Record<ExpenseCategory, string> = {
  LABOR: "Paid To (Contractor/Worker)",
  MATERIALS: "Paid To (Supplier)",
  UTILITIES: "Paid To (Provider)",
  MAINTENANCE: "Paid To (Vendor)",
  OTHER: "Paid To",
};

function NewExpenseForm() {
  const createExpense = useCreateExpense();
  const { showToast } = useToast();

  const [date, setDate] = useState(toDateOnly(new Date()));
  const [category, setCategory] = useState<ExpenseCategory>("LABOR");
  const [jobDetails, setJobDetails] = useState("");
  const [workerCount, setWorkerCount] = useState("");
  const [paidTo, setPaidTo] = useState("");
  const [amount, setAmount] = useState("");
  const [materialsPurchased, setMaterialsPurchased] = useState("");
  const [error, setError] = useState<string | null>(null);

  const showWorkerCount = category === "LABOR";
  const showMaterialsPurchased = category === "MATERIALS";

  function handleCategoryChange(next: ExpenseCategory) {
    setCategory(next);
    // Clear fields that no longer apply so a stale value from a previous
    // category can't be silently submitted with the new one.
    if (next !== "LABOR") setWorkerCount("");
    if (next !== "MATERIALS") setMaterialsPurchased("");
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
        category,
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
            value={category}
            onChange={(e) =>
              handleCategoryChange(e.target.value as ExpenseCategory)
            }
            className="input"
          >
            {EXPENSE_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {EXPENSE_CATEGORY_LABELS[cat]}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Job Details" required>
          <input
            value={jobDetails}
            onChange={(e) => setJobDetails(e.target.value)}
            placeholder={JOB_DETAILS_PLACEHOLDER[category]}
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
              placeholder="e.g. Kitchen roof sheets, Railing"
              className="input"
            />
          </Field>
        )}

        <Field label={PAID_TO_LABEL[category]} required>
          <input
            value={paidTo}
            onChange={(e) => setPaidTo(e.target.value)}
            placeholder="e.g. Natraj"
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

function RecentExpensesFeed() {
  const [page, setPage] = useState(1);
  const [categoryFilter, setCategoryFilter] = useState<ExpenseCategory | "">(
    "",
  );

  const { data, isPending, isError, isPlaceholderData } = useExpensesList({
    category: categoryFilter,
    page,
    pageSize: PAGE_SIZE,
  });

  const totalPages = data ? Math.max(1, Math.ceil(data.count / PAGE_SIZE)) : 1;

  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
        <h2 className="text-sm font-semibold text-slate-700">
          Recent Expenses
        </h2>
        <select
          value={categoryFilter}
          onChange={(e) => {
            setCategoryFilter(e.target.value as ExpenseCategory | "");
            setPage(1);
          }}
          className="input w-auto"
        >
          <option value="">All categories</option>
          {EXPENSE_CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {EXPENSE_CATEGORY_LABELS[cat]}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
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
                  No expenses recorded yet.
                </td>
              </tr>
            )}
            {data?.results.map((expense) => (
              <tr key={expense.id}>
                <td className="px-4 py-3 whitespace-nowrap text-slate-600">
                  {expense.date}
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-1.5 text-slate-600">
                    <span
                      className={cn(
                        "h-2 w-2 rounded-full",
                        EXPENSE_CATEGORY_DOT[expense.category],
                      )}
                    />
                    {EXPENSE_CATEGORY_LABELS[expense.category]}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-600">
                  <div>{expense.job_details}</div>
                  {expense.worker_count != null && (
                    <div className="text-xs text-slate-400">
                      {expense.worker_count} worker
                      {expense.worker_count === 1 ? "" : "s"}
                    </div>
                  )}
                  {expense.materials_purchased && (
                    <div className="text-xs text-slate-400">
                      {expense.materials_purchased}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-600">{expense.paid_to}</td>
                <td className="px-4 py-3 text-right font-medium text-slate-900">
                  Rs. {expense.amount}
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
