"use client";

import { Check, Search, UserRoundX } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import { useGuestSearch } from "@/lib/hooks/use-guest-search";
import type { Guest } from "@/lib/types";
import { cn } from "@/lib/cn";

interface GuestLookupFieldProps {
  selectedGuest: Guest | null;
  onSelectGuest: (guest: Guest | null) => void;
}

/**
 * Search-as-you-type lookup for returning guests by name or phone. Selecting
 * a result reuses their existing guest record (id) instead of creating a
 * duplicate. Clearing the selection falls back to plain name/phone entry.
 */
export function GuestLookupField({
  selectedGuest,
  onSelectGuest,
}: GuestLookupFieldProps) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const debouncedQuery = useDebouncedValue(query, 300);
  const { data: results, isFetching } = useGuestSearch(debouncedQuery);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (selectedGuest) {
    return (
      <div className="flex items-center justify-between rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2">
        <div className="flex items-center gap-2 text-sm">
          <Check className="h-4 w-4 text-emerald-600" />
          <span className="font-medium text-emerald-900">
            {selectedGuest.name}
          </span>
          <span className="text-emerald-700">{selectedGuest.phone}</span>
          <span className="text-xs text-emerald-600">Returning guest</span>
        </div>
        <button
          type="button"
          onClick={() => {
            onSelectGuest(null);
            setQuery("");
          }}
          className="text-emerald-600 hover:text-emerald-800"
          aria-label="Clear selected guest"
        >
          <UserRoundX className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Search returning guest by name or phone..."
          className="input pl-9"
        />
      </div>

      {isOpen && debouncedQuery.trim().length >= 2 && (
        <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-md border border-slate-200 bg-white shadow-lg">
          {isFetching && (
            <p className="px-3 py-2 text-sm text-slate-400">Searching...</p>
          )}
          {!isFetching && results && results.length === 0 && (
            <p className="px-3 py-2 text-sm text-slate-400">
              No matching guest &ndash; fill in the fields below to add a new
              one.
            </p>
          )}
          {!isFetching &&
            results?.map((guest) => (
              <button
                key={guest.id}
                type="button"
                onClick={() => {
                  onSelectGuest(guest);
                  setIsOpen(false);
                }}
                className={cn(
                  "flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-slate-50",
                )}
              >
                <span className="font-medium text-slate-800">{guest.name}</span>
                <span className="text-slate-500">{guest.phone}</span>
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
