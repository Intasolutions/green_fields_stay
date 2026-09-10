"use client";

import { useQuery } from "@tanstack/react-query";

import { apiClient } from "@/lib/api-client";
import type { RoomAvailabilityEntry } from "@/lib/types";

export function useRoomAvailability(startDate: string, endDate: string) {
  return useQuery({
    queryKey: ["room-availability", startDate, endDate],
    queryFn: async () => {
      const response = await apiClient.get<RoomAvailabilityEntry[]>(
        "/rooms/availability/",
        { params: { start_date: startDate, end_date: endDate } },
      );
      return response.data;
    },
  });
}
