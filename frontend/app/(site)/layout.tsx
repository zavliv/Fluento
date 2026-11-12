import { AuthProvider } from "@/components/auth/AuthProvider";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}
