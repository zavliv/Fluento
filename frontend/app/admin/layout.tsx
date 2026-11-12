import type { Metadata } from "next";
import { AdminAuthProvider } from "@/components/admin/AdminAuthProvider";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · Fluento Admin" },
  robots: { index: false, follow: false },
};

export const instant = false;

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return <AdminAuthProvider>{children}</AdminAuthProvider>;
}
