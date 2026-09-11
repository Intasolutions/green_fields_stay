"use client";

import {
  BedDouble,
  DoorClosed,
  DoorOpen,
  Pencil,
  Plus,
  Users as UsersIcon,
} from "lucide-react";
import { useState } from "react";

import { RequireRole } from "@/components/require-role";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { FilterBar, FilterField } from "@/components/ui/filter-bar";
import { getApiErrorMessage } from "@/lib/api-error";
import { useCreateRoom, useRooms, useUpdateRoom } from "@/lib/hooks/use-rooms";
import {
  BED_TYPE_LABELS,
  BED_TYPES,
  ROOM_CATEGORIES,
  ROOM_CATEGORY_BADGE,
  ROOM_CATEGORY_LABELS,
} from "@/lib/room-categories";
import type { BedType, Room, RoomCategory } from "@/lib/types";
import { cn } from "@/lib/cn";

export default function RoomsPage() {
  return (
    <RequireRole allowedRoles={["ADMIN"]}>
      <RoomsPageContent />
    </RequireRole>
  );
}

function RoomsPageContent() {
  const { data: rooms, isPending, isError } = useRooms();
  const { showToast } = useToast();
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<RoomCategory | "">("");

  const updateRoom = useUpdateRoom();

  async function handleToggleActive(room: Room) {
    try {
      await updateRoom.mutateAsync({
        roomId: room.id,
        isActive: !room.is_active,
      });
      showToast(
        room.is_active
          ? `Room ${room.number} deactivated.`
          : `Room ${room.number} activated.`,
      );
    } catch (err) {
      showToast(
        getApiErrorMessage(err, `Could not update Room ${room.number}.`),
        "error",
      );
    }
  }

  const activeCount = rooms?.filter((r) => r.is_active).length ?? 0;
  const visibleRooms = categoryFilter
    ? rooms?.filter((r) => r.category === categoryFilter)
    : rooms;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Rooms</h1>
          <p className="mt-1 text-sm text-slate-500">
            {rooms
              ? `${activeCount} active of ${rooms.length} total room${rooms.length === 1 ? "" : "s"}`
              : "Manage the property's rooms and their specifications."}
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800"
        >
          <Plus className="h-4 w-4" />
          Add Room
        </button>
      </div>

      <FilterBar onClear={categoryFilter ? () => setCategoryFilter("") : undefined}>
        <FilterField label="Category">
          <select
            value={categoryFilter}
            onChange={(e) =>
              setCategoryFilter(e.target.value as RoomCategory | "")
            }
            className="input w-auto"
          >
            <option value="">All categories</option>
            {ROOM_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {ROOM_CATEGORY_LABELS[cat]}
              </option>
            ))}
          </select>
        </FilterField>
      </FilterBar>

      {isPending && (
        <p className="rounded-lg border border-slate-200 bg-white px-5 py-8 text-center text-sm text-slate-500">
          Loading rooms...
        </p>
      )}
      {isError && (
        <p className="rounded-lg border border-slate-200 bg-white px-5 py-8 text-center text-sm text-red-600">
          Failed to load rooms.
        </p>
      )}

      {visibleRooms && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visibleRooms.map((room) => (
            <RoomCard
              key={room.id}
              room={room}
              onEdit={() => setEditingRoom(room)}
              onToggleActive={() => handleToggleActive(room)}
              isToggling={
                updateRoom.isPending && updateRoom.variables?.roomId === room.id
              }
            />
          ))}
        </div>
      )}

      {showAddModal && <AddRoomModal onClose={() => setShowAddModal(false)} />}
      {editingRoom && (
        <EditRoomModal room={editingRoom} onClose={() => setEditingRoom(null)} />
      )}
    </div>
  );
}

function RoomCard({
  room,
  onEdit,
  onToggleActive,
  isToggling,
}: {
  room: Room;
  onEdit: () => void;
  onToggleActive: () => void;
  isToggling: boolean;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
              room.is_active
                ? "bg-emerald-100 text-emerald-600"
                : "bg-slate-100 text-slate-400",
            )}
          >
            {room.is_active ? (
              <DoorOpen className="h-4.5 w-4.5" />
            ) : (
              <DoorClosed className="h-4.5 w-4.5" />
            )}
          </span>
          <div>
            <p className="text-sm font-semibold text-slate-900">
              Room {room.number}
            </p>
            <p className="text-xs text-slate-400">
              {room.is_active ? "Active" : "Inactive"}
            </p>
          </div>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-full px-2 py-0.5 text-xs font-medium",
            ROOM_CATEGORY_BADGE[room.category],
          )}
        >
          {ROOM_CATEGORY_LABELS[room.category]}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-600">
        <span className="flex items-center gap-1.5">
          <UsersIcon className="h-3.5 w-3.5 text-slate-400" />
          Sleeps {room.max_occupancy}
        </span>
        <span className="flex items-center gap-1.5">
          <BedDouble className="h-3.5 w-3.5 text-slate-400" />
          {BED_TYPE_LABELS[room.bed_type]}
        </span>
      </div>

      <div className="text-xs text-slate-500">
        {room.extra_bed_allowed ? (
          <span>
            Extra bed available
            {room.extra_bed_charge && ` (Rs. ${room.extra_bed_charge}/night)`}
          </span>
        ) : (
          <span className="text-slate-400">No extra bed</span>
        )}
      </div>

      {room.amenities && (
        <p className="line-clamp-2 text-xs text-slate-500">{room.amenities}</p>
      )}

      <div className="mt-auto flex items-center gap-2 pt-1">
        <button
          onClick={onEdit}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          <Pencil className="h-3.5 w-3.5" />
          Edit
        </button>
        <button
          onClick={onToggleActive}
          disabled={isToggling}
          className={cn(
            "flex-1 rounded-md border px-3 py-1.5 text-sm font-medium disabled:opacity-60",
            room.is_active
              ? "border-red-200 text-red-600 hover:bg-red-50"
              : "border-emerald-200 text-emerald-600 hover:bg-emerald-50",
          )}
        >
          {isToggling ? "Saving..." : room.is_active ? "Deactivate" : "Activate"}
        </button>
      </div>
    </div>
  );
}

function AddRoomModal({ onClose }: { onClose: () => void }) {
  const createRoom = useCreateRoom();
  const { showToast } = useToast();

  const [number, setNumber] = useState("");
  const [category, setCategory] = useState<RoomCategory>("NORMAL");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const trimmed = number.trim();
    if (!trimmed) {
      setError("Enter a room number.");
      return;
    }

    try {
      await createRoom.mutateAsync({ number: trimmed, category });
      showToast(`Room ${trimmed} added.`);
      onClose();
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not add room."));
    }
  }

  return (
    <Modal title="Add a Room" onClose={onClose} widthClassName="max-w-sm">
      <form onSubmit={handleSubmit} className="space-y-3">
        <RoomField label="Room Number" required>
          <input
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            placeholder="e.g. 12"
            className="input"
            autoFocus
          />
        </RoomField>
        <RoomField label="Category">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as RoomCategory)}
            className="input"
          >
            {ROOM_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {ROOM_CATEGORY_LABELS[cat]}
              </option>
            ))}
          </select>
        </RoomField>

        {error && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={createRoom.isPending}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
          >
            {createRoom.isPending ? "Adding..." : "Add Room"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function EditRoomModal({
  room,
  onClose,
}: {
  room: Room;
  onClose: () => void;
}) {
  const updateRoom = useUpdateRoom();
  const { showToast } = useToast();

  const [number, setNumber] = useState(room.number);
  const [category, setCategory] = useState<RoomCategory>(room.category);
  const [maxOccupancy, setMaxOccupancy] = useState(String(room.max_occupancy));
  const [bedType, setBedType] = useState<BedType>(room.bed_type);
  const [extraBedAllowed, setExtraBedAllowed] = useState(room.extra_bed_allowed);
  const [extraBedCharge, setExtraBedCharge] = useState(
    room.extra_bed_charge ?? "",
  );
  const [amenities, setAmenities] = useState(room.amenities ?? "");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const trimmedNumber = number.trim();
    if (!trimmedNumber) {
      setError("Room number cannot be empty.");
      return;
    }
    if (extraBedAllowed && (!extraBedCharge || parseFloat(extraBedCharge) <= 0)) {
      setError("Set an extra bed charge when extra beds are allowed.");
      return;
    }

    try {
      await updateRoom.mutateAsync({
        roomId: room.id,
        number: trimmedNumber,
        category,
        maxOccupancy: parseInt(maxOccupancy, 10) || 1,
        bedType,
        extraBedAllowed,
        extraBedCharge: extraBedAllowed ? extraBedCharge : null,
        amenities: amenities.trim() || null,
      });
      showToast(`Room ${trimmedNumber} updated.`);
      onClose();
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not update room."));
    }
  }

  return (
    <Modal title={`Edit Room ${room.number}`} onClose={onClose} widthClassName="max-w-lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <RoomField label="Room Number" required>
            <input
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              className="input"
              autoFocus
            />
          </RoomField>
          <RoomField label="Category">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as RoomCategory)}
              className="input"
            >
              {ROOM_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {ROOM_CATEGORY_LABELS[cat]}
                </option>
              ))}
            </select>
          </RoomField>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <RoomField label="Max Occupancy">
            <input
              type="number"
              min="1"
              value={maxOccupancy}
              onChange={(e) => setMaxOccupancy(e.target.value)}
              className="input"
            />
          </RoomField>
          <RoomField label="Bed Type">
            <select
              value={bedType}
              onChange={(e) => setBedType(e.target.value as BedType)}
              className="input"
            >
              {BED_TYPES.map((bt) => (
                <option key={bt} value={bt}>
                  {BED_TYPE_LABELS[bt]}
                </option>
              ))}
            </select>
          </RoomField>
        </div>

        <div className="rounded-md border border-slate-200 p-3">
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              checked={extraBedAllowed}
              onChange={(e) => setExtraBedAllowed(e.target.checked)}
            />
            Extra bed allowed
          </label>
          {extraBedAllowed && (
            <div className="mt-3">
              <RoomField label="Extra Bed Charge (Rs./night)" required>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={extraBedCharge}
                  onChange={(e) => setExtraBedCharge(e.target.value)}
                  className="input"
                />
              </RoomField>
            </div>
          )}
        </div>

        <RoomField label="Amenities">
          <textarea
            value={amenities}
            onChange={(e) => setAmenities(e.target.value)}
            placeholder="e.g. AC, Balcony, Sea view"
            rows={2}
            className="input resize-none"
          />
        </RoomField>

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
            disabled={updateRoom.isPending}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
          >
            {updateRoom.isPending ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function RoomField({
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
