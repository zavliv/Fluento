import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Plus_Jakarta_Sans } from "next/font/google";
import { Providers } from "@/components/Providers";
import { getPublicData } from "@/lib/server";
import { SITE, siteDescription, siteTitle } from "@/lib/site";
import "./globals.css";

const sans = Plus_Jakarta_Sans({ variable: "--font-jakarta", subsets: ["latin"] });
const mono = JetBrains_Mono({ variable: "--font-jetbrains", subsets: ["latin"] });

export async function generateMetadata(): Promise<Metadata> {
  const { settings, teachers } = await getPublicData();
  const name = settings.app_name;
  const title = siteTitle(name);
  const description = siteDescription(
    teachers.length,
    teachers.map((t) => t.specialty),
  );
  return {
    metadataBase: new URL(SITE.url),
    title: { default: title, template: `%s · ${name}` },
    description,
    applicationName: name,
    keywords: SITE.keywords,
    category: "education",
    alternates: { canonical: "/" },
    openGraph: { type: "website", siteName: name, title, description, url: "/", locale: "en_US" },
    twitter: { card: "summary_large_image", title, description },
    robots: { index: true, follow: true },
  };
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f5f1" },
    { media: "(prefers-color-scheme: dark)", color: "#131312" },
  ],
};

const themeScript = `(function(){try{var t=localStorage.getItem('theme')||'system';var d=t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.dataset.theme=d?'dark':'light';}catch(e){}})();`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" suppressHydrationWarning className={`${sans.variable} ${mono.variable} h-full antialiased`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="h-full">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
