"use client";

import { Ban, Pencil } from "lucide-react";
import { useState } from "react";

import { useBooking } from "@/lib/hooks/use-bookings";
import {
  useAddPayment,
  useCancelBooking,
  useCheckIn,
  useCheckOut,
} from "@/lib/hooks/use-booking-mutations";
import { useCurrentUser } from "@/lib/hooks/use-current-user";
import { getApiErrorMessage } from "@/lib/api-error";
import { nightsBetween } from "@/lib/date-utils";
import { BED_TYPE_LABELS } from "@/lib/room-categories";
import type { PaymentMethod } from "@/lib/types";
import { cn } from "@/lib/cn";
import { Modal } from "@/components/ui/modal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import { StatusBadge } from "@/components/status-badge";
import { SourceLogo } from "@/components/source-logo";
import { EditBookingModal } from "@/components/dashboard/edit-booking-modal";

interface BookingDetailModalProps {
  bookingId: string;
  onClose: () => void;
}

type PendingAction = "CHECK_IN" | "CHECK_OUT" | "CANCEL" | null;

export function BookingDetailModal({
  bookingId,
  onClose,
}: BookingDetailModalProps) {
  const { data: booking, isLoading, isError } = useBooking(bookingId);
  const { data: currentUser } = useCurrentUser();
  const checkIn = useCheckIn();
  const checkOut = useCheckOut();
  const cancelBooking = useCancelBooking();
  const addPayment = useAddPayment();
  const { showToast } = useToast();

  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
  const [error, setError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [cancellationReason, setCancellationReason] = useState("");
  const [showEditModal, setShowEditModal] = useState(false);

  const isMutating = checkIn.isPending || checkOut.isPending || cancelBooking.isPending;

  async function handleConfirmCheckIn() {
    setError(null);
    try {
      await checkIn.mutateAsync(bookingId);
      showToast("Guest checked in.");
      setPendingAction(null);
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not check in this booking."));
      setPendingAction(null);
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
      showToast("Payment recorded.");
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not record payment."));
    }
  }

  async function handleConfirmCheckOut() {
    setError(null);
    try {
      await checkOut.mutateAsync({ bookingId });
      showToast("Guest checked out.");
      setPendingAction(null);
      onClose();
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not complete check-out."));
      setPendingAction(null);
    }
  }

  async function handleConfirmCancel() {
    setError(null);
    try {
      await cancelBooking.mutateAsync({
        bookingId,
        cancellationReason: cancellationReason.trim() || undefined,
      });
      showToast("Booking cancelled.");
      setPendingAction(null);
      onClose();
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not cancel this booking."));
      setPendingAction(null);
    }
  }

  const canCancel =
    currentUser?.role === "ADMIN" &&
    booking &&
    booking.status !== "CHECKED_OUT" &&
    booking.status !== "CANCELLED";

  const canEdit = currentUser?.role === "ADMIN" && booking;

  return (
    <>
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
                {booking.guest.aadhar_number && (
                  <p className="text-xs text-slate-400">
                    Aadhaar: {booking.guest.aadhar_number}
                  </p>
                )}
                {booking.profile_tag && (
                  <p className="mt-0.5 text-xs text-slate-400">
                    {booking.profile_tag}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={booking.status} />
                {canEdit && (
                  <button
                    onClick={() => setShowEditModal(true)}
                    className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                    aria-label="Edit booking"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>

            {booking.companions.length > 0 && (
              <div>
                <p className="mb-1.5 text-xs font-medium text-slate-500">
                  Companions
                </p>
                <ul className="space-y-1 text-sm">
                  {booking.companions.map((companion) => (
                    <li
                      key={companion.id}
                      className="rounded-md bg-slate-50 px-2.5 py-1.5"
                    >
                      <span className="font-medium text-slate-700">
                        {companion.name}
                      </span>
                      {companion.aadhar_number && (
                        <span className="text-slate-400">
                          {" "}
                          &middot; Aadhaar: {companion.aadhar_number}
                        </span>
                      )}
                      {companion.phone && (
                        <span className="text-slate-400">
                          {" "}
                          &middot; {companion.phone}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 rounded-lg bg-slate-50 p-3 text-sm">
              <InfoRow label="Check-in" value={booking.check_in} />
              <InfoRow label="Check-out" value={booking.check_out} />
              <InfoRow
                label="Nights"
                value={String(nightsBetween(booking.check_in, booking.check_out))}
              />
              <div>
                <p className="text-xs text-slate-400">Source</p>
                <SourceLogo source={booking.source} size="xs" withLabel className="mt-0.5" />
              </div>
              {booking.ota_reference_id && (
                <InfoRow label="OTA Ref" value={booking.ota_reference_id} />
              )}
            </div>

            <div>
              <p className="mb-1.5 text-xs font-medium text-slate-500">Rooms</p>
              <ul className="space-y-1.5">
                {booking.allocated_rooms.map((allocation) => (
                  <li
                    key={allocation.id}
                    className="flex items-center justify-between rounded-md bg-slate-50 px-2.5 py-1.5 text-sm"
                  >
                    <span className="font-medium text-slate-700">
                      Room {allocation.room_number}
                    </span>
                    <span className="text-xs text-slate-400">
                      {allocation.room_detail.category === "DELUXE" && "Deluxe · "}
                      Sleeps {allocation.room_detail.max_occupancy} &middot;{" "}
                      {BED_TYPE_LABELS[allocation.room_detail.bed_type]}
                    </span>
                  </li>
                ))}
              </ul>
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

            {booking.status === "CANCELLED" && booking.cancellation_reason && (
              <p className="rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-500">
                Cancelled: {booking.cancellation_reason}
              </p>
            )}

            {error && (
              <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            )}

            {booking.status === "CONFIRMED" && (
              <button
                onClick={() => setPendingAction("CHECK_IN")}
                disabled={isMutating}
                className="w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
              >
                Check In
              </button>
            )}

            {booking.status === "CHECKED_IN" && (
              <div className="space-y-3 border-t border-slate-100 pt-4">
                {parseFloat(booking.balance_due) > 0 && (
                  <form onSubmit={handleRecordPayment} className="space-y-2">
                    <p className="text-xs font-medium text-slate-500">
                      Record Settlement Payment
                    </p>
                    <div className="flex flex-col gap-2 sm:grid sm:grid-cols-3">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="Amount"
                        value={paymentAmount}
                        onChange={(e) => setPaymentAmount(e.target.value)}
                        className="input"
                      />
                      <select
                        value={paymentMethod}
                        onChange={(e) =>
                          setPaymentMethod(e.target.value as PaymentMethod)
                        }
                        className="input"
                      >
                        <option value="CASH">Cash</option>
                        <option value="UPI">UPI</option>
                        <option value="CARD">Card</option>
                      </select>
                      <button
                        type="submit"
                        disabled={addPayment.isPending}
                        className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                      >
                        {addPayment.isPending ? "Saving..." : "Record"}
                      </button>
                    </div>
                  </form>
                )}

                <button
                  onClick={() => setPendingAction("CHECK_OUT")}
                  disabled={isMutating || parseFloat(booking.balance_due) > 0}
                  className="w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
                  title={
                    parseFloat(booking.balance_due) > 0
                      ? "Settle the outstanding balance before checking out"
                      : undefined
                  }
                >
                  Complete Check-out
                </button>
              </div>
            )}

            {canCancel && (
              <div className="border-t border-slate-100 pt-4">
                <button
                  onClick={() => setPendingAction("CANCEL")}
                  disabled={isMutating}
                  className="flex w-full items-center justify-center gap-1.5 rounded-md border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
                >
                  <Ban className="h-4 w-4" />
                  Cancel Booking
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>

      {pendingAction === "CHECK_IN" && (
        <ConfirmDialog
          title="Check in this guest?"
          description="This marks the booking as checked in and updates the room matrix."
          confirmLabel="Check In"
          isConfirming={checkIn.isPending}
          onConfirm={handleConfirmCheckIn}
          onCancel={() => setPendingAction(null)}
        />
      )}

      {pendingAction === "CHECK_OUT" && (
        <ConfirmDialog
          title="Complete check-out?"
          description="This frees the room(s) for new bookings starting today. This cannot be undone from here."
          confirmLabel="Complete Check-out"
          isConfirming={checkOut.isPending}
          onConfirm={handleConfirmCheckOut}
          onCancel={() => setPendingAction(null)}
        />
      )}

      {pendingAction === "CANCEL" && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl">
            <h2 className="text-sm font-semibold text-slate-900">
              Cancel this booking?
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              The room(s) will be freed immediately for new bookings. This
              cannot be undone.
            </p>
            <label className="mt-3 block">
              <span className="mb-1 block text-xs font-medium text-slate-500">
                Cancellation reason (optional)
              </span>
              <input
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                className="input"
                placeholder="e.g. Guest request"
              />
            </label>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setPendingAction(null)}
                disabled={cancelBooking.isPending}
                className="rounded-md border border-slate-200 px-3.5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-60"
              >
                Keep Booking
              </button>
              <button
                onClick={handleConfirmCancel}
                disabled={cancelBooking.isPending}
                className="rounded-md bg-red-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
              >
                {cancelBooking.isPending ? "Cancelling..." : "Cancel Booking"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showEditModal && booking && (
        <EditBookingModal
          booking={booking}
          onClose={() => setShowEditModal(false)}
        />
      )}
    </>
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
