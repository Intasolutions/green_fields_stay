"use client";

import { useQuery } from "@tanstack/react-query";

import { apiClient } from "@/lib/api-client";
import type { FinancialSummaryReport, OccupancyReport } from "@/lib/types";

export function useFinancialSummaryReport(from: string, to: string) {
  return useQuery({
    queryKey: ["reports", "financial-summary", from, to],
    queryFn: async () => {
      const response = await apiClient.get<FinancialSummaryReport>(
        "/reports/financial-summary/",
        { params: { from, to } },
      );
      return response.data;
    },
    enabled: Boolean(from && to),
  });
}

export function useOccupancyReport(from: string, to: string) {
  return useQuery({
    queryKey: ["reports", "occupancy", from, to],
    queryFn: async () => {
      const response = await apiClient.get<OccupancyReport>(
        "/reports/occupancy/",
        { params: { from, to } },
      );
      return response.data;
    },
    enabled: Boolean(from && to),
  });
}
