import { SidebarNav } from "@/components/sidebar-nav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen w-full print:block">
      <div className="print:hidden">
        <SidebarNav />
      </div>
      <main className="flex-1 overflow-y-auto p-6 print:overflow-visible print:p-0">
        {children}
      </main>
    </div>
  );
}
