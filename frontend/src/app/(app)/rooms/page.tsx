"use client";

import { DoorClosed, DoorOpen, Pencil, Plus, X } from "lucide-react";
import { useState } from "react";

import { RequireRole } from "@/components/require-role";
import { useToast } from "@/components/ui/toast";
import { getApiErrorMessage } from "@/lib/api-error";
import { useCreateRoom, useRooms, useUpdateRoom } from "@/lib/hooks/use-rooms";
import {
  ROOM_CATEGORIES,
  ROOM_CATEGORY_BADGE,
  ROOM_CATEGORY_LABELS,
} from "@/lib/room-categories";
import type { Room, RoomCategory } from "@/lib/types";
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
  const [newRoomNumber, setNewRoomNumber] = useState("");
  const [newRoomCategory, setNewRoomCategory] = useState<RoomCategory>("NORMAL");
  const [addError, setAddError] = useState<string | null>(null);
  const [editingRoomId, setEditingRoomId] = useState<number | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<RoomCategory | "">("");

  const createRoom = useCreateRoom();
  const updateRoom = useUpdateRoom();

  async function handleAddRoom(e: React.FormEvent) {
    e.preventDefault();
    setAddError(null);

    const trimmed = newRoomNumber.trim();
    if (!trimmed) {
      setAddError("Enter a room number.");
      return;
    }

    try {
      await createRoom.mutateAsync({ number: trimmed, category: newRoomCategory });
      setNewRoomNumber("");
      showToast(`Room ${trimmed} added.`);
    } catch (err) {
      setAddError(getApiErrorMessage(err, "Could not add room."));
    }
  }

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
        "success",
      );
    } catch (err) {
      showToast(
        getApiErrorMessage(
          err,
          `Could not update Room ${room.number}.`,
        ),
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
      <div>
        <h1 className="text-lg font-semibold text-slate-900">Rooms</h1>
        <p className="mt-1 text-sm text-slate-500">
          Add rooms to the property, rename them, set their category, or
          deactivate rooms that are temporarily out of service.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]">
        <div className="h-fit rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-slate-700">
            Add a Room
          </h2>
          <form onSubmit={handleAddRoom} className="space-y-3">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-500">
                Room Number
              </span>
              <input
                value={newRoomNumber}
                onChange={(e) => setNewRoomNumber(e.target.value)}
                placeholder="e.g. 12"
                className="input"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-500">
                Category
              </span>
              <select
                value={newRoomCategory}
                onChange={(e) =>
                  setNewRoomCategory(e.target.value as RoomCategory)
                }
                className="input"
              >
                {ROOM_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {ROOM_CATEGORY_LABELS[cat]}
                  </option>
                ))}
              </select>
            </label>
            {addError && (
              <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                {addError}
              </p>
            )}
            <button
              type="submit"
              disabled={createRoom.isPending}
              className="flex w-full items-center justify-center gap-1.5 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
            >
              <Plus className="h-4 w-4" />
              {createRoom.isPending ? "Adding..." : "Add Room"}
            </button>
          </form>

          {rooms && (
            <p className="mt-4 text-xs text-slate-400">
              {activeCount} active of {rooms.length} total room
              {rooms.length === 1 ? "" : "s"}
            </p>
          )}
        </div>

        <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <h2 className="text-sm font-semibold text-slate-700">All Rooms</h2>
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
          </div>

          {isPending && (
            <p className="px-5 py-8 text-center text-sm text-slate-500">
              Loading rooms...
            </p>
          )}
          {isError && (
            <p className="px-5 py-8 text-center text-sm text-red-600">
              Failed to load rooms.
            </p>
          )}

          {visibleRooms && (
            <ul className="divide-y divide-slate-100">
              {visibleRooms.map((room) => (
                <RoomRow
                  key={room.id}
                  room={room}
                  isEditing={editingRoomId === room.id}
                  onStartEdit={() => setEditingRoomId(room.id)}
                  onStopEdit={() => setEditingRoomId(null)}
                  onToggleActive={() => handleToggleActive(room)}
                  isToggling={
                    updateRoom.isPending &&
                    updateRoom.variables?.roomId === room.id
                  }
                />
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function RoomRow({
  room,
  isEditing,
  onStartEdit,
  onStopEdit,
  onToggleActive,
  isToggling,
}: {
  room: Room;
  isEditing: boolean;
  onStartEdit: () => void;
  onStopEdit: () => void;
  onToggleActive: () => void;
  isToggling: boolean;
}) {
  const { showToast } = useToast();
  const updateRoom = useUpdateRoom();
  const [draftNumber, setDraftNumber] = useState(room.number);
  const [draftCategory, setDraftCategory] = useState<RoomCategory>(
    room.category,
  );
  const [renameError, setRenameError] = useState<string | null>(null);

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    setRenameError(null);

    const trimmed = draftNumber.trim();
    if (!trimmed) {
      setRenameError("Room number cannot be empty.");
      return;
    }

    try {
      await updateRoom.mutateAsync({
        roomId: room.id,
        number: trimmed,
        category: draftCategory,
      });
      showToast(`Room ${trimmed} updated.`);
      onStopEdit();
    } catch (err) {
      setRenameError(getApiErrorMessage(err, "Could not update room."));
    }
  }

  if (isEditing) {
    return (
      <li className="px-5 py-3">
        <form onSubmit={handleSaveEdit} className="flex items-center gap-2">
          <input
            value={draftNumber}
            onChange={(e) => setDraftNumber(e.target.value)}
            autoFocus
            className="input flex-1"
          />
          <select
            value={draftCategory}
            onChange={(e) => setDraftCategory(e.target.value as RoomCategory)}
            className="input w-32"
          >
            {ROOM_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {ROOM_CATEGORY_LABELS[cat]}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={updateRoom.isPending}
            className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
          >
            Save
          </button>
          <button
            type="button"
            onClick={() => {
              setDraftNumber(room.number);
              setDraftCategory(room.category);
              setRenameError(null);
              onStopEdit();
            }}
            className="flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50"
            aria-label="Cancel edit"
          >
            <X className="h-4 w-4" />
          </button>
        </form>
        {renameError && (
          <p className="mt-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {renameError}
          </p>
        )}
      </li>
    );
  }

  return (
    <li className="flex items-center justify-between px-5 py-3">
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-full",
            room.is_active
              ? "bg-emerald-100 text-emerald-600"
              : "bg-slate-100 text-slate-400",
          )}
        >
          {room.is_active ? (
            <DoorOpen className="h-4 w-4" />
          ) : (
            <DoorClosed className="h-4 w-4" />
          )}
        </span>
        <div>
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-slate-900">
              Room {room.number}
            </p>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-xs font-medium",
                ROOM_CATEGORY_BADGE[room.category],
              )}
            >
              {ROOM_CATEGORY_LABELS[room.category]}
            </span>
          </div>
          <p className="text-xs text-slate-400">
            {room.is_active ? "Active" : "Inactive"}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onStartEdit}
          className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          aria-label={`Edit Room ${room.number}`}
        >
          <Pencil className="h-4 w-4" />
        </button>
        <button
          onClick={onToggleActive}
          disabled={isToggling}
          className={cn(
            "rounded-md border px-3 py-1.5 text-sm font-medium disabled:opacity-60",
            room.is_active
              ? "border-red-200 text-red-600 hover:bg-red-50"
              : "border-emerald-200 text-emerald-600 hover:bg-emerald-50",
          )}
        >
          {isToggling
            ? "Saving..."
            : room.is_active
              ? "Deactivate"
              : "Activate"}
        </button>
      </div>
    </li>
  );
}
