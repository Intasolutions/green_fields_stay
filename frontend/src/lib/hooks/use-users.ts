"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "@/lib/api-client";
import type { CreateStaffUserPayload, StaffUser, UserRole } from "@/lib/types";

export function useStaffUsers() {
  return useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const response = await apiClient.get<StaffUser[]>("/users/");
      return response.data;
    },
  });
}

function useInvalidateUsers() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ["users"] });
  };
}

export function useCreateStaffUser() {
  const invalidate = useInvalidateUsers();

  return useMutation({
    mutationFn: async (payload: CreateStaffUserPayload) => {
      const response = await apiClient.post<StaffUser>("/users/", payload);
      return response.data;
    },
    onSuccess: () => invalidate(),
  });
}

export function useUpdateStaffUser() {
  const invalidate = useInvalidateUsers();

  return useMutation({
    mutationFn: async ({
      userId,
      role,
      isActive,
    }: {
      userId: number;
      role?: UserRole;
      isActive?: boolean;
    }) => {
      const response = await apiClient.patch<StaffUser>(`/users/${userId}/`, {
        ...(role !== undefined ? { role } : {}),
        ...(isActive !== undefined ? { is_active: isActive } : {}),
      });
      return response.data;
    },
    onSuccess: () => invalidate(),
  });
}
