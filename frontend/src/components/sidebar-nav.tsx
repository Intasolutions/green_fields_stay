"use client";

import {
  CalendarDays,
  ClipboardList,
  DoorClosed,
  LayoutDashboard,
  LineChart,
  LogOut,
  Receipt,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { useCurrentUser } from "@/lib/hooks/use-current-user";
import type { UserRole } from "@/lib/types";
import { cn } from "@/lib/cn";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  /** If set, only these roles see the link. Omit to show to everyone. */
  allowedRoles?: UserRole[];
}

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/bookings", label: "Bookings", icon: ClipboardList },
  {
    href: "/expenses",
    label: "Expenses",
    icon: Receipt,
    allowedRoles: ["MANAGER", "ADMIN"],
  },
  {
    href: "/reports",
    label: "Reports",
    icon: LineChart,
    allowedRoles: ["ADMIN"],
  },
  {
    href: "/rooms",
    label: "Rooms",
    icon: DoorClosed,
    allowedRoles: ["ADMIN"],
  },
];

export function SidebarNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: user, isLoading } = useCurrentUser();

  const visibleItems = NAV_ITEMS.filter((item) => {
    if (!item.allowedRoles) return true;
    // While the role is still loading, hide restricted links by default
    // rather than flashing them for a role that shouldn't see them.
    if (isLoading || !user) return false;
    return item.allowedRoles.includes(user.role);
  });

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="flex h-screen w-60 shrink-0 flex-col border-r border-slate-200 bg-white">
      <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-4">
        <CalendarDays className="h-5 w-5 text-slate-900" />
        <span className="text-sm font-semibold text-slate-900">
          Green Fields Stay
        </span>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {visibleItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition",
                isActive
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-200 px-3 py-4">
        {user && (
          <div className="mb-3 px-3">
            <p className="truncate text-sm font-medium text-slate-900">
              {user.first_name || user.username}
            </p>
            <p className="text-xs text-slate-500">{user.role}</p>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
        >
          <LogOut className="h-4 w-4" />
          Log out
        </button>
      </div>
    </aside>
  );
}
