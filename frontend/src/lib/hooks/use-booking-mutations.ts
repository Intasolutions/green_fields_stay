"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "@/lib/api-client";
import type {
  AddPaymentPayload,
  Booking,
  CreateBookingPayload,
  EditBookingPayload,
} from "@/lib/types";

function useInvalidateBookingQueries() {
  const queryClient = useQueryClient();
  return (bookingId?: string) => {
    queryClient.invalidateQueries({ queryKey: ["room-availability"] });
    queryClient.invalidateQueries({ queryKey: ["bookings"] });
    if (bookingId) {
      queryClient.invalidateQueries({ queryKey: ["booking", bookingId] });
    }
  };
}

export function useCreateBooking() {
  const invalidate = useInvalidateBookingQueries();

  return useMutation({
    mutationFn: async (payload: CreateBookingPayload) => {
      const response = await apiClient.post<Booking>("/bookings/", payload);
      return response.data;
    },
    onSuccess: () => invalidate(),
  });
}

export function useCheckIn() {
  const invalidate = useInvalidateBookingQueries();

  return useMutation({
    mutationFn: async (bookingId: string) => {
      const response = await apiClient.patch<Booking>(
        `/bookings/${bookingId}/check-in/`,
      );
      return response.data;
    },
    onSuccess: (data) => invalidate(data.id),
  });
}

export function useCheckOut() {
  const invalidate = useInvalidateBookingQueries();

  return useMutation({
    mutationFn: async ({
      bookingId,
      overrideBalance,
    }: {
      bookingId: string;
      overrideBalance?: boolean;
    }) => {
      const response = await apiClient.patch<Booking>(
        `/bookings/${bookingId}/check-out/`,
        { override_balance: overrideBalance ?? false },
      );
      return response.data;
    },
    onSuccess: (data) => invalidate(data.id),
  });
}

export function useEditBooking() {
  const invalidate = useInvalidateBookingQueries();

  return useMutation({
    mutationFn: async ({
      bookingId,
      payload,
    }: {
      bookingId: string;
      payload: EditBookingPayload;
    }) => {
      const response = await apiClient.patch<Booking>(
        `/bookings/${bookingId}/`,
        payload,
      );
      return response.data;
    },
    onSuccess: (data) => invalidate(data.id),
  });
}

export function useCancelBooking() {
  const invalidate = useInvalidateBookingQueries();

  return useMutation({
    mutationFn: async ({
      bookingId,
      cancellationReason,
    }: {
      bookingId: string;
      cancellationReason?: string;
    }) => {
      const response = await apiClient.patch<Booking>(
        `/bookings/${bookingId}/cancel/`,
        { cancellation_reason: cancellationReason ?? "" },
      );
      return response.data;
    },
    onSuccess: (data) => invalidate(data.id),
  });
}

export function useAddPayment() {
  const invalidate = useInvalidateBookingQueries();

  return useMutation({
    mutationFn: async ({
      bookingId,
      payload,
    }: {
      bookingId: string;
      payload: AddPaymentPayload;
    }) => {
      const response = await apiClient.post<Booking>(
        `/bookings/${bookingId}/payments/`,
        payload,
      );
      return response.data;
    },
    onSuccess: (data) => invalidate(data.id),
  });
}
