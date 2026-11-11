"use client";

import { CalendarDays } from "lucide-react";
import { useRef, useState } from "react";

import { cn } from "@/lib/cn";
import { formatDate, parseDisplayDate } from "@/lib/date-utils";

interface DateInputProps {
  /** YYYY-MM-DD, or "" when empty - same as a native date input. */
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  className?: string;
  "aria-label"?: string;
}

const INVALID_MESSAGE = "Enter a valid date as dd/mm/yyyy.";

/** Inserts the slashes as digits are typed: "1011" -> "10/11". */
function maskDigits(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

/**
 * Date field that always shows dd/mm/yyyy. A native date input follows the
 * browser's locale (mm/dd/yyyy on a US-English browser), so this is a typed
 * text field with the native calendar picker opened from the icon button.
 */
export function DateInput({
  value,
  onChange,
  required,
  className,
  "aria-label": ariaLabel,
}: DateInputProps) {
  const textRef = useRef<HTMLInputElement>(null);
  const pickerRef = useRef<HTMLInputElement>(null);
  // Text mid-edit; null while the field simply shows `value`.
  const [draft, setDraft] = useState<string | null>(null);

  function setValidity(message: string) {
    textRef.current?.setCustomValidity(message);
  }

  function handleTextChange(raw: string) {
    const masked = maskDigits(raw);

    if (masked === "") {
      // Keep the field empty while focused even if the parent ignores ""
      // (e.g. the room matrix, which always needs a date), so a new date
      // can be typed in; blur falls back to the parent's value.
      setDraft("");
      setValidity(required ? INVALID_MESSAGE : "");
      onChange("");
      return;
    }

    const parsed = parseDisplayDate(masked);
    if (parsed) {
      setDraft(null);
      setValidity("");
      onChange(parsed);
    } else {
      setDraft(masked);
      setValidity(INVALID_MESSAGE);
    }
  }

  function handleBlur() {
    // Drop an unfinished entry and fall back to the last valid date.
    setDraft(null);
    setValidity("");
  }

  function openPicker() {
    const picker = pickerRef.current;
    if (!picker) return;
    try {
      picker.showPicker();
    } catch {
      picker.focus();
    }
  }

  return (
    <div className={cn("relative", className)}>
      <input
        ref={textRef}
        type="text"
        inputMode="numeric"
        placeholder="dd/mm/yyyy"
        maxLength={10}
        value={draft ?? formatDate(value)}
        onChange={(e) => handleTextChange(e.target.value)}
        onBlur={handleBlur}
        required={required}
        aria-label={ariaLabel}
        className="input pr-9"
      />
      <button
        type="button"
        onClick={openPicker}
        tabIndex={-1}
        aria-label="Open calendar"
        className="absolute inset-y-0 right-0 flex w-9 items-center justify-center text-slate-400 hover:text-slate-600"
      >
        <CalendarDays className="h-4 w-4" />
      </button>
      <input
        ref={pickerRef}
        type="date"
        value={value}
        onChange={(e) => {
          setDraft(null);
          setValidity("");
          onChange(e.target.value);
        }}
        tabIndex={-1}
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 right-0 h-0 w-0 opacity-0"
      />
    </div>
  );
}
