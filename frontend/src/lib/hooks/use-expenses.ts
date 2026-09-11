"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "@/lib/api-client";
import type { PaginatedResponse } from "@/lib/hooks/use-bookings";
import type { CreateExpensePayload, Expense, ExpenseCategory } from "@/lib/types";

export interface ExpensesListParams {
  fromDate?: string;
  toDate?: string;
  category?: number | "";
  page?: number;
  pageSize?: number;
}

export function useExpensesList(params: ExpensesListParams) {
  const { fromDate, toDate, category, page = 1, pageSize = 20 } = params;

  return useQuery({
    queryKey: ["expenses", { fromDate, toDate, category, page, pageSize }],
    queryFn: async () => {
      const response = await apiClient.get<PaginatedResponse<Expense>>(
        "/expenses/",
        {
          params: {
            from_date: fromDate || undefined,
            to_date: toDate || undefined,
            category: category || undefined,
            page,
            page_size: pageSize,
          },
        },
      );
      return response.data;
    },
    placeholderData: (previousData) => previousData,
  });
}

/**
 * Fetches every expense matching the given filters across all pages.
 * Used for CSV export, where the download must cover the full filtered
 * range rather than just the page currently on screen.
 */
export async function fetchAllExpenses(
  params: Pick<ExpensesListParams, "fromDate" | "toDate" | "category">,
): Promise<Expense[]> {
  const { fromDate, toDate, category } = params;
  const results: Expense[] = [];
  let page = 1;
  const pageSize = 200;

  while (true) {
    const response = await apiClient.get<PaginatedResponse<Expense>>(
      "/expenses/",
      {
        params: {
          from_date: fromDate || undefined,
          to_date: toDate || undefined,
          category: category || undefined,
          page,
          page_size: pageSize,
        },
      },
    );
    results.push(...response.data.results);
    if (!response.data.next) break;
    page += 1;
  }

  return results;
}

export function useCreateExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateExpensePayload) => {
      const response = await apiClient.post<Expense>("/expenses/", payload);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
    },
  });
}

export function useExpenseCategories(activeOnly = false) {
  return useQuery({
    queryKey: ["expense-categories", activeOnly],
    queryFn: async () => {
      const response = await apiClient.get<ExpenseCategory[]>(
        "/expense-categories/",
        { params: activeOnly ? { active_only: 1 } : undefined },
      );
      return response.data;
    },
  });
}

function useInvalidateExpenseCategories() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ["expense-categories"] });
  };
}

export function useCreateExpenseCategory() {
  const invalidate = useInvalidateExpenseCategories();

  return useMutation({
    mutationFn: async (payload: {
      name: string;
      tracks_worker_count: boolean;
      tracks_materials: boolean;
    }) => {
      const response = await apiClient.post<ExpenseCategory>(
        "/expense-categories/",
        payload,
      );
      return response.data;
    },
    onSuccess: () => invalidate(),
  });
}

export function useUpdateExpenseCategory() {
  const invalidate = useInvalidateExpenseCategories();

  return useMutation({
    mutationFn: async ({
      categoryId,
      ...payload
    }: {
      categoryId: number;
      name?: string;
      tracks_worker_count?: boolean;
      tracks_materials?: boolean;
      is_active?: boolean;
    }) => {
      const response = await apiClient.patch<ExpenseCategory>(
        `/expense-categories/${categoryId}/`,
        payload,
      );
      return response.data;
    },
    onSuccess: () => invalidate(),
  });
}
