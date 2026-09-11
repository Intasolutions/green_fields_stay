"use client";

import { useMemo, useState } from "react";

import { useEditBooking } from "@/lib/hooks/use-booking-mutations";
import { getApiErrorMessage } from "@/lib/api-error";
import { BOOKING_SOURCES, OTA_SOURCES, SOURCE_STYLES } from "@/lib/source-colors";
import type { Booking, BookingSource } from "@/lib/types";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";

interface EditBookingModalProps {
  booking: Booking;
  onClose: () => void;
}

/**
 * Admin-only correction form for a booking already created: rate fixes,
 * date changes, source/tag corrections. Guest and room allocation are not
 * editable here - cancel + rebook covers changing which rooms are used.
 */
export function EditBookingModal({ booking, onClose }: EditBookingModalProps) {
  const editBooking = useEditBooking();
  const { showToast } = useToast();

  const [source, setSource] = useState<BookingSource>(booking.source);
  const [otaReferenceId, setOtaReferenceId] = useState(
    booking.ota_reference_id ?? "",
  );
  const [profileTag, setProfileTag] = useState(booking.profile_tag ?? "");
  const [checkIn, setCheckIn] = useState(booking.check_in);
  const [checkOut, setCheckOut] = useState(booking.check_out);
  const [totalAmount, setTotalAmount] = useState(booking.total_amount);
  const [otaCommission, setOtaCommission] = useState(booking.ota_commission);
  const [error, setError] = useState<string | null>(null);

  const isOta = OTA_SOURCES.includes(source);

  const netPayout = useMemo(() => {
    const total = parseFloat(totalAmount || "0");
    const commission = parseFloat(otaCommission || "0");
    if (Number.isNaN(total)) return "0.00";
    const net = total - (Number.isNaN(commission) ? 0 : commission);
    return net.toFixed(2);
  }, [totalAmount, otaCommission]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!checkIn || !checkOut || checkOut <= checkIn) {
      setError("Check-out date must be after check-in date.");
      return;
    }
    if (!totalAmount || parseFloat(totalAmount) <= 0) {
      setError("Enter a valid total amount.");
      return;
    }

    try {
      await editBooking.mutateAsync({
        bookingId: booking.id,
        payload: {
          source,
          ota_reference_id: isOta ? otaReferenceId.trim() || null : null,
          profile_tag: profileTag.trim() || null,
          check_in: checkIn,
          check_out: checkOut,
          total_amount: totalAmount,
          ota_commission: isOta ? otaCommission || "0" : "0",
          net_payout: isOta ? netPayout : totalAmount,
        },
      });
      showToast("Booking updated.");
      onClose();
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not update booking."));
    }
  }

  return (
    <Modal title="Edit Booking" onClose={onClose} widthClassName="max-w-lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-700">
          Guest and room assignment can&apos;t be changed here. To change
          rooms, cancel this booking and create a new one.
        </p>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Check-in" required>
            <input
              type="date"
              value={checkIn}
              onChange={(e) => setCheckIn(e.target.value)}
              className="input"
              required
            />
          </Field>
          <Field label="Check-out" required>
            <input
              type="date"
              value={checkOut}
              onChange={(e) => setCheckOut(e.target.value)}
              className="input"
              required
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Source" required>
            <select
              value={source}
              onChange={(e) => setSource(e.target.value as BookingSource)}
              className="input"
            >
              {BOOKING_SOURCES.map((s) => (
                <option key={s} value={s}>
                  {SOURCE_STYLES[s].label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Total Amount (Rs.)" required>
            <input
              type="number"
              min="0"
              step="0.01"
              value={totalAmount}
              onChange={(e) => setTotalAmount(e.target.value)}
              className="input"
              required
            />
          </Field>

          {isOta && (
            <>
              <Field label="OTA Reference ID">
                <input
                  value={otaReferenceId}
                  onChange={(e) => setOtaReferenceId(e.target.value)}
                  className="input"
                />
              </Field>
              <Field label="Commission (Rs.)">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={otaCommission}
                  onChange={(e) => setOtaCommission(e.target.value)}
                  className="input"
                />
              </Field>
              <Field label="Net Payout (Rs.)">
                <input value={netPayout} readOnly className="input bg-slate-50" />
              </Field>
            </>
          )}
        </div>

        <Field label="Profile Tag">
          <input
            value={profileTag}
            onChange={(e) => setProfileTag(e.target.value)}
            placeholder="e.g. Family of 4, Couple"
            className="input"
          />
        </Field>

        {error && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={editBooking.isPending}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
          >
            {editBooking.isPending ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-500">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </span>
      {children}
    </label>
  );
}
