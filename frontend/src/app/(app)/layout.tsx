import { MobileTopBar } from "@/components/mobile-nav";
import { SidebarNav } from "@/components/sidebar-nav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen w-full print:block">
      <div className="print:hidden">
        <SidebarNav />
        <MobileTopBar />
      </div>
      {/*
        On mobile: pt-20 clears the fixed 56px top bar + breathing room.
        On lg+:    reset to p-6 with the sidebar offset (ml-60).
      */}
      <main className="min-h-screen overflow-y-auto px-4 pb-6 pt-20 sm:px-6 lg:ml-60 lg:p-6 print:ml-0 print:overflow-visible print:p-0">
        {children}
      </main>
    </div>
  );
}
