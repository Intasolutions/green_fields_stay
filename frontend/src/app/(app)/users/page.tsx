"use client";

import { Plus, ShieldCheck, UserCog, UserX } from "lucide-react";
import { useState } from "react";

import { RequireRole } from "@/components/require-role";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { getApiErrorMessage } from "@/lib/api-error";
import { useCurrentUser } from "@/lib/hooks/use-current-user";
import {
  useCreateStaffUser,
  useStaffUsers,
  useUpdateStaffUser,
} from "@/lib/hooks/use-users";
import type { StaffUser, UserRole } from "@/lib/types";
import { cn } from "@/lib/cn";

const ROLES: UserRole[] = ["RECEPTIONIST", "MANAGER", "ADMIN"];

const ROLE_BADGE: Record<UserRole, string> = {
  RECEPTIONIST: "bg-slate-100 text-slate-600",
  MANAGER: "bg-blue-100 text-blue-700",
  ADMIN: "bg-violet-100 text-violet-700",
};

const ROLE_LABELS: Record<UserRole, string> = {
  RECEPTIONIST: "Receptionist",
  MANAGER: "Manager",
  ADMIN: "Admin",
};

export default function UsersPage() {
  return (
    <RequireRole allowedRoles={["ADMIN"]}>
      <UsersPageContent />
    </RequireRole>
  );
}

function UsersPageContent() {
  const { data: users, isPending, isError } = useStaffUsers();
  const { data: currentUser } = useCurrentUser();
  const [showAddModal, setShowAddModal] = useState(false);

  const activeCount = users?.filter((u) => u.is_active).length ?? 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Users</h1>
          <p className="mt-1 text-sm text-slate-500">
            {users
              ? `${activeCount} active of ${users.length} staff account${users.length === 1 ? "" : "s"}`
              : "Manage staff logins and their roles."}
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800"
        >
          <Plus className="h-4 w-4" />
          Add User
        </button>
      </div>

      {isPending && (
        <p className="rounded-lg border border-slate-200 bg-white px-5 py-8 text-center text-sm text-slate-500">
          Loading users...
        </p>
      )}
      {isError && (
        <p className="rounded-lg border border-slate-200 bg-white px-5 py-8 text-center text-sm text-red-600">
          Failed to load users.
        </p>
      )}

      {users && (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((user) => (
                  <UserRow
                    key={user.id}
                    user={user}
                    isSelf={user.id === currentUser?.id}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showAddModal && <AddUserModal onClose={() => setShowAddModal(false)} />}
    </div>
  );
}

function UserRow({ user, isSelf }: { user: StaffUser; isSelf: boolean }) {
  const { showToast } = useToast();
  const updateUser = useUpdateStaffUser();
  const [showRoleMenu, setShowRoleMenu] = useState(false);

  async function handleRoleChange(role: UserRole) {
    setShowRoleMenu(false);
    if (role === user.role) return;
    try {
      await updateUser.mutateAsync({ userId: user.id, role });
      showToast(`${user.username}'s role updated to ${ROLE_LABELS[role]}.`);
    } catch (err) {
      showToast(getApiErrorMessage(err, "Could not update role."), "error");
    }
  }

  async function handleToggleActive() {
    try {
      await updateUser.mutateAsync({
        userId: user.id,
        isActive: !user.is_active,
      });
      showToast(
        user.is_active
          ? `${user.username} deactivated.`
          : `${user.username} activated.`,
      );
    } catch (err) {
      showToast(getApiErrorMessage(err, "Could not update user."), "error");
    }
  }

  return (
    <tr>
      <td className="px-4 py-3">
        <div className="font-medium text-slate-900">
          {user.first_name || user.last_name
            ? `${user.first_name} ${user.last_name}`.trim()
            : user.username}
          {isSelf && <span className="ml-1.5 text-xs text-slate-400">(you)</span>}
        </div>
        <div className="text-xs text-slate-400">@{user.username}</div>
      </td>
      <td className="px-4 py-3">
        <div className="relative inline-block">
          <button
            onClick={() => setShowRoleMenu((v) => !v)}
            className={cn(
              "flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium",
              ROLE_BADGE[user.role],
            )}
          >
            <ShieldCheck className="h-3 w-3" />
            {ROLE_LABELS[user.role]}
          </button>
          {showRoleMenu && (
            <div className="absolute left-0 z-10 mt-1 w-40 rounded-md border border-slate-200 bg-white py-1 shadow-lg">
              {ROLES.map((role) => (
                <button
                  key={role}
                  onClick={() => handleRoleChange(role)}
                  className={cn(
                    "flex w-full items-center px-3 py-1.5 text-left text-sm hover:bg-slate-50",
                    role === user.role
                      ? "font-medium text-slate-900"
                      : "text-slate-600",
                  )}
                >
                  {ROLE_LABELS[role]}
                </button>
              ))}
            </div>
          )}
        </div>
      </td>
      <td className="px-4 py-3">
        <span
          className={cn(
            "rounded-full px-2.5 py-1 text-xs font-medium",
            user.is_active
              ? "bg-emerald-100 text-emerald-700"
              : "bg-slate-100 text-slate-500",
          )}
        >
          {user.is_active ? "Active" : "Inactive"}
        </span>
      </td>
      <td className="px-4 py-3 text-right">
        <button
          onClick={handleToggleActive}
          disabled={updateUser.isPending || isSelf}
          title={isSelf ? "You cannot deactivate your own account" : undefined}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-40",
            user.is_active
              ? "border-red-200 text-red-600 hover:bg-red-50"
              : "border-emerald-200 text-emerald-600 hover:bg-emerald-50",
          )}
        >
          <UserX className="h-3.5 w-3.5" />
          {user.is_active ? "Deactivate" : "Activate"}
        </button>
      </td>
    </tr>
  );
}

function AddUserModal({ onClose }: { onClose: () => void }) {
  const createUser = useCreateStaffUser();
  const { showToast } = useToast();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<UserRole>("RECEPTIONIST");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!username.trim()) {
      setError("Enter a username.");
      return;
    }
    if (!password || password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    try {
      await createUser.mutateAsync({
        username: username.trim(),
        password,
        first_name: firstName.trim() || undefined,
        last_name: lastName.trim() || undefined,
        email: email.trim() || undefined,
        role,
      });
      showToast(`User ${username.trim()} created.`);
      onClose();
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not create user."));
    }
  }

  return (
    <Modal title="Add User" onClose={onClose} widthClassName="max-w-sm">
      <form onSubmit={handleSubmit} className="space-y-3">
        <Field label="Username" required>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="input"
            autoFocus
            required
          />
        </Field>
        <Field label="Password" required>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
            className="input"
            required
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="First Name">
            <input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="input"
            />
          </Field>
          <Field label="Last Name">
            <input
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="input"
            />
          </Field>
        </div>
        <Field label="Email">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input"
          />
        </Field>
        <Field label="Role" required>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
            className="input"
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </select>
        </Field>

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
            disabled={createUser.isPending}
            className="flex items-center gap-1.5 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
          >
            <UserCog className="h-4 w-4" />
            {createUser.isPending ? "Creating..." : "Create User"}
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
