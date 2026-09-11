const DOT_COLORS = [
  "bg-orange-500",
  "bg-sky-500",
  "bg-violet-500",
  "bg-emerald-500",
  "bg-rose-500",
  "bg-amber-500",
  "bg-cyan-500",
  "bg-indigo-500",
];

/**
 * Expense categories are now Admin-managed (not a fixed enum), so colors
 * are assigned deterministically by category id rather than hardcoded per
 * name - any new category an Admin creates still gets a stable color.
 */
export function expenseCategoryDotColor(categoryId: number): string {
  return DOT_COLORS[categoryId % DOT_COLORS.length];
}
