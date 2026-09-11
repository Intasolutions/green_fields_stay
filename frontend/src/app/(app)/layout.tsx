import { SidebarNav } from "@/components/sidebar-nav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen w-full print:block">
      <div className="print:hidden">
        <SidebarNav />
      </div>
      <main className="min-h-screen overflow-y-auto p-6 lg:ml-60 print:ml-0 print:overflow-visible print:p-0">
        {children}
      </main>
    </div>
  );
}
