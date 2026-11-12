import { Suspense } from "react";
import { ClientRoot } from "@/components/ClientRoot";
import { getPublicData } from "@/lib/server";
import { SITE, siteDescription, siteTitle } from "@/lib/site";

export const instant = false;

export default async function Home() {
  const { settings, teachers } = await getPublicData();
  const title = siteTitle(settings.app_name);
  const description = siteDescription(
    teachers.length,
    teachers.map((t) => t.specialty),
  );
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: settings.app_name,
    url: SITE.url,
    description,
    applicationCategory: "EducationalApplication",
    operatingSystem: "Web",
    inLanguage: "en",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    audience: { "@type": "EducationalAudience", educationalRole: "student" },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }}
      />
      <header className="sr-only">
        <h1>{title}</h1>
        <p>{description}</p>
        <h2>Choose your English teacher</h2>
        <ul>
          {teachers.map((t) => (
            <li key={t.id}>
              {t.name}, {t.specialty} ({t.level}): {t.tagline}
            </li>
          ))}
        </ul>
      </header>
      <Suspense fallback={<div className="h-dvh bg-bg" />}>
        <ClientRoot />
      </Suspense>
    </>
  );
}
