"use client";

import { ShieldAlert } from "lucide-react";

import { useCurrentUser } from "@/lib/hooks/use-current-user";
import type { UserRole } from "@/lib/types";

interface RequireRoleProps {
  allowedRoles: UserRole[];
  children: React.ReactNode;
}

/**
 * Client-side guard for pages restricted to specific roles. The sidebar
 * already hides links a user shouldn't see, but this covers direct
 * navigation to the URL (typed, bookmarked, or shared) so the page shows a
 * clear message instead of a broken screen full of 403s from the API.
 */
export function RequireRole({ allowedRoles, children }: RequireRoleProps) {
  const { data: user, isLoading } = useCurrentUser();

  if (isLoading) {
    return <p className="text-sm text-slate-500">Loading...</p>;
  }

  if (!user || !allowedRoles.includes(user.role)) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 py-16 text-center">
        <ShieldAlert className="h-8 w-8 text-slate-300" />
        <p className="text-sm font-medium text-slate-600">
          You don&apos;t have access to this page.
        </p>
        <p className="text-sm text-slate-400">
          This section is restricted to {formatRoleList(allowedRoles)}.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}

function formatRoleList(roles: UserRole[]): string {
  const labels = roles.map((r) => r.charAt(0) + r.slice(1).toLowerCase());
  if (labels.length === 1) return labels[0];
  return `${labels.slice(0, -1).join(", ")} and ${labels[labels.length - 1]}`;
}
