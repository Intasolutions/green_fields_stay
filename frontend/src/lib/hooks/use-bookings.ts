"use client";

import { useQuery } from "@tanstack/react-query";

import { apiClient } from "@/lib/api-client";
import type { Booking, BookingStatus } from "@/lib/types";

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface BookingsListParams {
  search?: string;
  status?: BookingStatus | "";
  page?: number;
  pageSize?: number;
}

export function useBookingsList(params: BookingsListParams) {
  const { search, status, page = 1, pageSize = 20 } = params;

  return useQuery({
    queryKey: ["bookings", "list", { search, status, page, pageSize }],
    queryFn: async () => {
      const response = await apiClient.get<PaginatedResponse<Booking>>(
        "/bookings/",
        {
          params: {
            search: search || undefined,
            status: status || undefined,
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

export function useBookingsByCheckInDate(date: string) {
  return useQuery({
    queryKey: ["bookings", "check_in", date],
    queryFn: async () => {
      const response = await apiClient.get<PaginatedResponse<Booking>>(
        "/bookings/",
        { params: { check_in: date, page_size: 100 } },
      );
      return response.data.results;
    },
  });
}

export function useBookingsByCheckOutDate(date: string) {
  return useQuery({
    queryKey: ["bookings", "check_out", date],
    queryFn: async () => {
      const response = await apiClient.get<PaginatedResponse<Booking>>(
        "/bookings/",
        { params: { check_out: date, page_size: 100 } },
      );
      return response.data.results;
    },
  });
}

export function useBooking(bookingId: string | null) {
  return useQuery({
    queryKey: ["booking", bookingId],
    queryFn: async () => {
      const response = await apiClient.get<Booking>(`/bookings/${bookingId}/`);
      return response.data;
    },
    enabled: Boolean(bookingId),
  });
}
