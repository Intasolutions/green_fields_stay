"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "@/lib/api-client";
import type { Room } from "@/lib/types";

export function useRooms() {
  return useQuery({
    queryKey: ["rooms"],
    queryFn: async () => {
      const response = await apiClient.get<Room[]>("/rooms/");
      return response.data;
    },
  });
}

function useInvalidateRooms() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ["rooms"] });
    queryClient.invalidateQueries({ queryKey: ["room-availability"] });
  };
}

export function useCreateRoom() {
  const invalidate = useInvalidateRooms();

  return useMutation({
    mutationFn: async (number: string) => {
      const response = await apiClient.post<Room>("/rooms/", { number });
      return response.data;
    },
    onSuccess: () => invalidate(),
  });
}

export function useUpdateRoom() {
  const invalidate = useInvalidateRooms();

  return useMutation({
    mutationFn: async ({
      roomId,
      number,
      isActive,
    }: {
      roomId: number;
      number?: string;
      isActive?: boolean;
    }) => {
      const response = await apiClient.patch<Room>(`/rooms/${roomId}/`, {
        ...(number !== undefined ? { number } : {}),
        ...(isActive !== undefined ? { is_active: isActive } : {}),
      });
      return response.data;
    },
    onSuccess: () => invalidate(),
  });
}
