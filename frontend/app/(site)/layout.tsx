import type { Metadata } from "next";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { getPublicData } from "@/lib/server";
import { siteDescription, siteTitle } from "@/lib/site";

export async function generateMetadata(): Promise<Metadata> {
  const { settings, teachers } = await getPublicData();
  const name = settings.app_name;
  const title = siteTitle(name);
  const description = siteDescription(
    teachers.length,
    teachers.map((t) => t.specialty),
  );
  return {
    title: { default: title, template: `%s · ${name}` },
    description,
    applicationName: name,
    alternates: { canonical: "/" },
    openGraph: { type: "website", siteName: name, title, description, url: "/", locale: "en_US" },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}
