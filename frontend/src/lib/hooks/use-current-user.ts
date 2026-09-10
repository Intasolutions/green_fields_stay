"use client";

import { useQuery } from "@tanstack/react-query";

import { apiClient } from "@/lib/api-client";
import type { CurrentUser } from "@/lib/types";

async function fetchCurrentUser(): Promise<CurrentUser> {
  const response = await apiClient.get<CurrentUser>("/auth/me/");
  return response.data;
}

export function useCurrentUser() {
  return useQuery({
    queryKey: ["current-user"],
    queryFn: fetchCurrentUser,
  });
}
