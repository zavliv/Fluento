import { Suspense } from "react";
import { AdminShell } from "@/components/admin/AdminShell";

export const instant = false;

export default function PanelLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense>
      <AdminShell>{children}</AdminShell>
    </Suspense>
  );
}
