import { Sidebar } from "@/components/dashboard/sidebar";
import { RouteGuard } from "@/components/dashboard/route-guard";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-ink">
      <Sidebar />
      <div className="md:pl-56">
        <RouteGuard>{children}</RouteGuard>
      </div>
    </div>
  );
}
