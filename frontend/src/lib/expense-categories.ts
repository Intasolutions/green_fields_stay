import type { ExpenseCategory } from "@/lib/types";

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  "LABOR",
  "MATERIALS",
  "UTILITIES",
  "MAINTENANCE",
  "OTHER",
];

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  LABOR: "Labor",
  MATERIALS: "Materials",
  UTILITIES: "Utilities",
  MAINTENANCE: "Maintenance",
  OTHER: "Other",
};

export const EXPENSE_CATEGORY_DOT: Record<ExpenseCategory, string> = {
  LABOR: "bg-orange-500",
  MATERIALS: "bg-sky-500",
  UTILITIES: "bg-yellow-500",
  MAINTENANCE: "bg-violet-500",
  OTHER: "bg-slate-400",
};
