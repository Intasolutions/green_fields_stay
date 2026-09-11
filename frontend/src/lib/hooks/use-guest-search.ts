"use client";

import { useQuery } from "@tanstack/react-query";

import { apiClient } from "@/lib/api-client";
import type { Guest } from "@/lib/types";

export function useGuestSearch(search: string) {
  const trimmed = search.trim();

  return useQuery({
    queryKey: ["guests", "search", trimmed],
    queryFn: async () => {
      const response = await apiClient.get<Guest[]>("/guests/", {
        params: { search: trimmed },
      });
      return response.data;
    },
    enabled: trimmed.length >= 2,
  });
}
