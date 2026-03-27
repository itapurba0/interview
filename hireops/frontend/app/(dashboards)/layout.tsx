import { Navbar } from "@/components/layout/Navbar";

export default function DashboardsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col pt-16">
      <Navbar />
      <main className="flex-1 flex flex-col relative">
        {children}
      </main>
    </div>
  );
}
