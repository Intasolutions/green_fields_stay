"use client";

import { useState } from "react";

import { useBooking } from "@/lib/hooks/use-bookings";
import {
  useAddPayment,
  useCheckIn,
  useCheckOut,
} from "@/lib/hooks/use-booking-mutations";
import { getApiErrorMessage } from "@/lib/api-error";
import { nightsBetween } from "@/lib/date-utils";
import { SOURCE_STYLES } from "@/lib/source-colors";
import type { PaymentMethod } from "@/lib/types";
import { cn } from "@/lib/cn";
import { Modal } from "@/components/ui/modal";
import { StatusBadge } from "@/components/status-badge";

interface BookingDetailModalProps {
  bookingId: string;
  onClose: () => void;
}

export function BookingDetailModal({
  bookingId,
  onClose,
}: BookingDetailModalProps) {
  const { data: booking, isLoading, isError } = useBooking(bookingId);
  const checkIn = useCheckIn();
  const checkOut = useCheckOut();
  const addPayment = useAddPayment();

  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
  const [error, setError] = useState<string | null>(null);

  async function handleCheckIn() {
    setError(null);
    try {
      await checkIn.mutateAsync(bookingId);
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not check in this booking."));
    }
  }

  async function handleRecordPayment(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
      setError("Enter a valid payment amount.");
      return;
    }

    try {
      await addPayment.mutateAsync({
        bookingId,
        payload: {
          amount: paymentAmount,
          payment_type: "SETTLEMENT",
          payment_method: paymentMethod,
        },
      });
      setPaymentAmount("");
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not record payment."));
    }
  }

  async function handleCheckOut() {
    setError(null);
    try {
      await checkOut.mutateAsync({ bookingId });
      onClose();
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not complete check-out."));
    }
  }

  return (
    <Modal title="Booking Details" onClose={onClose}>
      {isLoading && <p className="text-sm text-slate-500">Loading...</p>}
      {isError && (
        <p className="text-sm text-red-600">Failed to load booking.</p>
      )}

      {booking && (
        <div className="space-y-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-base font-semibold text-slate-900">
                {booking.guest.name}
              </p>
              <p className="text-sm text-slate-500">{booking.guest.phone}</p>
              {booking.profile_tag && (
                <p className="mt-0.5 text-xs text-slate-400">
                  {booking.profile_tag}
                </p>
              )}
            </div>
            <StatusBadge status={booking.status} />
          </div>

          <div className="grid grid-cols-2 gap-3 rounded-lg bg-slate-50 p-3 text-sm">
            <InfoRow label="Check-in" value={booking.check_in} />
            <InfoRow label="Check-out" value={booking.check_out} />
            <InfoRow
              label="Nights"
              value={String(nightsBetween(booking.check_in, booking.check_out))}
            />
            <InfoRow
              label="Rooms"
              value={booking.allocated_rooms
                .map((r) => r.room_number)
                .join(", ")}
            />
            <InfoRow
              label="Source"
              value={SOURCE_STYLES[booking.source].label}
            />
            {booking.ota_reference_id && (
              <InfoRow label="OTA Ref" value={booking.ota_reference_id} />
            )}
          </div>

          <div className="rounded-lg border border-slate-200 p-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">Total Charges</span>
              <span className="font-medium text-slate-900">
                Rs. {booking.total_amount}
              </span>
            </div>
            <div className="mt-1 flex items-center justify-between text-sm">
              <span className="text-slate-500">Amount Paid</span>
              <span className="font-medium text-slate-900">
                Rs. {booking.amount_paid}
              </span>
            </div>
            <div className="mt-1 flex items-center justify-between border-t border-slate-100 pt-1 text-sm">
              <span className="font-medium text-slate-700">Balance Due</span>
              <span
                className={cn(
                  "font-semibold",
                  parseFloat(booking.balance_due) > 0
                    ? "text-red-600"
                    : "text-emerald-600",
                )}
              >
                Rs. {booking.balance_due}
              </span>
            </div>
          </div>

          {booking.payments.length > 0 && (
            <div>
              <p className="mb-1.5 text-xs font-medium text-slate-500">
                Payment History
              </p>
              <ul className="space-y-1 text-sm">
                {booking.payments.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center justify-between rounded-md bg-slate-50 px-2.5 py-1.5"
                  >
                    <span className="text-slate-600">
                      {p.payment_type} &middot; {p.payment_method}
                    </span>
                    <span className="font-medium text-slate-900">
                      Rs. {p.amount}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {error && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          {booking.status === "CONFIRMED" && (
            <button
              onClick={handleCheckIn}
              disabled={checkIn.isPending}
              className="w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
            >
              {checkIn.isPending ? "Checking in..." : "Check In"}
            </button>
          )}

          {booking.status === "CHECKED_IN" && (
            <div className="space-y-3 border-t border-slate-100 pt-4">
              {parseFloat(booking.balance_due) > 0 && (
                <form onSubmit={handleRecordPayment} className="space-y-2">
                  <p className="text-xs font-medium text-slate-500">
                    Record Settlement Payment
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Amount"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      className="input col-span-1"
                    />
                    <select
                      value={paymentMethod}
                      onChange={(e) =>
                        setPaymentMethod(e.target.value as PaymentMethod)
                      }
                      className="input col-span-1"
                    >
                      <option value="CASH">Cash</option>
                      <option value="UPI">UPI</option>
                      <option value="CARD">Card</option>
                    </select>
                    <button
                      type="submit"
                      disabled={addPayment.isPending}
                      className="col-span-1 rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                    >
                      {addPayment.isPending ? "Saving..." : "Record"}
                    </button>
                  </div>
                </form>
              )}

              <button
                onClick={handleCheckOut}
                disabled={
                  checkOut.isPending || parseFloat(booking.balance_due) > 0
                }
                className="w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
                title={
                  parseFloat(booking.balance_due) > 0
                    ? "Settle the outstanding balance before checking out"
                    : undefined
                }
              >
                {checkOut.isPending
                  ? "Checking out..."
                  : "Complete Check-out"}
              </button>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-slate-400">{label}</p>
      <p className="font-medium text-slate-700">{value}</p>
    </div>
  );
}
