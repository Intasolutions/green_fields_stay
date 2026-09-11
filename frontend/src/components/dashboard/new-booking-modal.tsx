"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { useCreateBooking } from "@/lib/hooks/use-booking-mutations";
import { getApiErrorMessage } from "@/lib/api-error";
import { BOOKING_SOURCES, OTA_SOURCES, SOURCE_STYLES } from "@/lib/source-colors";
import { addDays, toDateOnly } from "@/lib/date-utils";
import type { BookingSource, Guest, PaymentMethod, Room } from "@/lib/types";
import { cn } from "@/lib/cn";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { GuestLookupField } from "@/components/dashboard/guest-lookup-field";

interface NewBookingModalProps {
  rooms: Room[];
  initialRoomId?: number;
  initialDate?: string;
  onClose: () => void;
  onCreated: () => void;
}

type PaymentMode = "NONE" | "NOW";

export function NewBookingModal({
  rooms,
  initialRoomId,
  initialDate,
  onClose,
  onCreated,
}: NewBookingModalProps) {
  const createBooking = useCreateBooking();
  const { showToast } = useToast();
  const nameInputRef = useRef<HTMLInputElement>(null);

  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null);
  const [selectedRoomIds, setSelectedRoomIds] = useState<number[]>(
    initialRoomId ? [initialRoomId] : [],
  );
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [guestAadhar, setGuestAadhar] = useState("");
  const [checkIn, setCheckIn] = useState(initialDate ?? toDateOnly(new Date()));
  const [checkOut, setCheckOut] = useState(
    toDateOnly(addDays(new Date(initialDate ?? toDateOnly(new Date())), 1)),
  );
  const [source, setSource] = useState<BookingSource>("DIRECT");
  const [otaReferenceId, setOtaReferenceId] = useState("");
  const [otaCommission, setOtaCommission] = useState("");
  const [profileTag, setProfileTag] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [paymentMode, setPaymentMode] = useState<PaymentMode>("NONE");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
  const [formError, setFormError] = useState<string | null>(null);

  const isOta = OTA_SOURCES.includes(source);

  const netPayout = useMemo(() => {
    const total = parseFloat(totalAmount || "0");
    const commission = parseFloat(otaCommission || "0");
    if (Number.isNaN(total)) return "0.00";
    const net = total - (Number.isNaN(commission) ? 0 : commission);
    return net.toFixed(2);
  }, [totalAmount, otaCommission]);

  useEffect(() => {
    nameInputRef.current?.focus();
  }, []);

  function toggleRoom(roomId: number) {
    setSelectedRoomIds((prev) =>
      prev.includes(roomId)
        ? prev.filter((id) => id !== roomId)
        : [...prev, roomId],
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (selectedRoomIds.length === 0) {
      setFormError("Select at least one room.");
      return;
    }
    if (!selectedGuest && (!guestName.trim() || !guestPhone.trim())) {
      setFormError("Guest name and phone are required.");
      return;
    }
    if (!checkOut || !checkIn || checkOut <= checkIn) {
      setFormError("Check-out date must be after check-in date.");
      return;
    }
    if (!totalAmount || parseFloat(totalAmount) <= 0) {
      setFormError("Enter a valid total amount.");
      return;
    }
    if (paymentMode === "NOW" && (!paymentAmount || parseFloat(paymentAmount) <= 0)) {
      setFormError("Enter a valid payment amount.");
      return;
    }

    try {
      await createBooking.mutateAsync({
        guest: selectedGuest
          ? { id: selectedGuest.id }
          : {
              name: guestName.trim(),
              phone: guestPhone.trim(),
              aadhar_number: guestAadhar.trim() || null,
            },
        room_ids: selectedRoomIds,
        source,
        ota_reference_id: isOta ? otaReferenceId.trim() || null : null,
        profile_tag: profileTag.trim() || null,
        check_in: checkIn,
        check_out: checkOut,
        total_amount: totalAmount,
        ota_commission: isOta ? otaCommission || "0" : "0",
        net_payout: isOta ? netPayout : totalAmount,
        initial_payment:
          paymentMode === "NOW"
            ? {
                amount: paymentAmount,
                payment_method: paymentMethod,
                payment_type: "ADVANCE",
              }
            : undefined,
      });

      showToast("Booking created successfully.");
      onCreated();
    } catch (error) {
      setFormError(getApiErrorMessage(error, "Could not create booking."));
    }
  }

  return (
    <Modal title="New Booking" onClose={onClose} widthClassName="max-w-2xl">
      <form onSubmit={handleSubmit} className="space-y-5">
        <section>
          <h3 className="mb-2 text-sm font-semibold text-slate-700">
            Guest Details
          </h3>

          <div className="mb-3">
            <GuestLookupField
              selectedGuest={selectedGuest}
              onSelectGuest={setSelectedGuest}
            />
          </div>

          {!selectedGuest && (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Name" required>
                <input
                  ref={nameInputRef}
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  className="input"
                  required
                />
              </Field>
              <Field label="Phone" required>
                <input
                  value={guestPhone}
                  onChange={(e) => setGuestPhone(e.target.value)}
                  className="input"
                  required
                />
              </Field>
              <Field label="Aadhaar (optional)">
                <input
                  value={guestAadhar}
                  onChange={(e) => setGuestAadhar(e.target.value)}
                  className="input"
                />
              </Field>
              <Field label="Profile Tag">
                <input
                  value={profileTag}
                  onChange={(e) => setProfileTag(e.target.value)}
                  placeholder="e.g. Family of 4, Couple"
                  className="input"
                />
              </Field>
            </div>
          )}

          {selectedGuest && (
            <Field label="Profile Tag">
              <input
                value={profileTag}
                onChange={(e) => setProfileTag(e.target.value)}
                placeholder="e.g. Family of 4, Couple"
                className="input"
              />
            </Field>
          )}
        </section>

        <section>
          <h3 className="mb-2 text-sm font-semibold text-slate-700">
            Rooms &amp; Dates
          </h3>
          <div className="mb-3">
            <p className="mb-1.5 text-xs font-medium text-slate-500">
              Select room(s)
            </p>
            <div className="flex flex-wrap gap-2">
              {rooms.map((room) => {
                const isSelected = selectedRoomIds.includes(room.id);
                return (
                  <button
                    type="button"
                    key={room.id}
                    onClick={() => toggleRoom(room.id)}
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-md border text-sm font-medium transition",
                      isSelected
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-slate-200 text-slate-600 hover:border-slate-400",
                    )}
                  >
                    {room.number}
                  </button>
                );
              })}
            </div>
          </div>
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
        </section>

        <section>
          <h3 className="mb-2 text-sm font-semibold text-slate-700">
            Source &amp; Pricing
          </h3>
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
        </section>

        <section>
          <h3 className="mb-2 text-sm font-semibold text-slate-700">Payment</h3>
          <div className="mb-3 flex gap-2">
            <button
              type="button"
              onClick={() => setPaymentMode("NONE")}
              className={cn(
                "rounded-md border px-3 py-1.5 text-sm font-medium",
                paymentMode === "NONE"
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-200 text-slate-600",
              )}
            >
              Pay at Checkout
            </button>
            <button
              type="button"
              onClick={() => setPaymentMode("NOW")}
              className={cn(
                "rounded-md border px-3 py-1.5 text-sm font-medium",
                paymentMode === "NOW"
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-200 text-slate-600",
              )}
            >
              Pay Now
            </button>
          </div>

          {paymentMode === "NOW" && (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Amount (Rs.)" required>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="input"
                  required
                />
              </Field>
              <Field label="Method" required>
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
              </Field>
            </div>
          )}
        </section>

        {formError && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {formError}
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
            disabled={createBooking.isPending}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
          >
            {createBooking.isPending ? "Creating..." : "Create Booking"}
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
