"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "@/lib/api-client";
import type { Room, RoomCategory, UpdateRoomPayload } from "@/lib/types";

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
    mutationFn: async ({
      number,
      category,
    }: {
      number: string;
      category: RoomCategory;
    }) => {
      const response = await apiClient.post<Room>("/rooms/", {
        number,
        category,
      });
      return response.data;
    },
    onSuccess: () => invalidate(),
  });
}

export interface UpdateRoomVariables extends UpdateRoomPayload {
  roomId: number;
  isActive?: boolean;
  maxOccupancy?: number;
  bedType?: UpdateRoomPayload["bed_type"];
  extraBedAllowed?: boolean;
  extraBedCharge?: string | null;
}

export function useUpdateRoom() {
  const invalidate = useInvalidateRooms();

  return useMutation({
    mutationFn: async ({
      roomId,
      isActive,
      maxOccupancy,
      bedType,
      extraBedAllowed,
      extraBedCharge,
      ...rest
    }: UpdateRoomVariables) => {
      const payload: UpdateRoomPayload = { ...rest };
      if (isActive !== undefined) payload.is_active = isActive;
      if (maxOccupancy !== undefined) payload.max_occupancy = maxOccupancy;
      if (bedType !== undefined) payload.bed_type = bedType;
      if (extraBedAllowed !== undefined) payload.extra_bed_allowed = extraBedAllowed;
      if (extraBedCharge !== undefined) payload.extra_bed_charge = extraBedCharge;

      const response = await apiClient.patch<Room>(`/rooms/${roomId}/`, payload);
      return response.data;
    },
    onSuccess: () => invalidate(),
  });
}
