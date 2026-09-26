"use client";

import { useQuery, keepPreviousData } from "@tanstack/react-query";

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
  checkInFrom?: string;
  checkInTo?: string;
  page?: number;
  pageSize?: number;
  ordering?: string;
}

export function useBookingsList(params: BookingsListParams) {
  const {
    search,
    status,
    checkInFrom,
    checkInTo,
    page = 1,
    pageSize = 20,
    ordering,
  } = params;

  return useQuery({
    queryKey: [
      "bookings",
      "list",
      { search, status, checkInFrom, checkInTo, page, pageSize, ordering },
    ],
    queryFn: async () => {
      const response = await apiClient.get<PaginatedResponse<Booking>>(
        "/bookings/",
        {
          params: {
            search: search || undefined,
            status: status || undefined,
            check_in_from: checkInFrom || undefined,
            check_in_to: checkInTo || undefined,
            page,
            page_size: pageSize,
            ordering: ordering || undefined,
          },
        },
      );
      return response.data;
    },
    placeholderData: keepPreviousData,
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
