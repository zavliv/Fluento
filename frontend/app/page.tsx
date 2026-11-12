import { ClientRoot } from "@/components/ClientRoot";
import { SITE } from "@/lib/site";
import { TEACHERS } from "@/lib/teachers";

const teachers = TEACHERS.filter((t) => t.enabled);

const structuredData = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: SITE.name,
  url: SITE.url,
  description: SITE.description,
  applicationCategory: "EducationalApplication",
  operatingSystem: "Web",
  inLanguage: "en",
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  audience: { "@type": "EducationalAudience", educationalRole: "student" },
};

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }}
      />
      <header className="sr-only">
        <h1>{SITE.title}</h1>
        <p>{SITE.description}</p>
        <h2>Choose your English teacher</h2>
        <ul>
          {teachers.map((t) => (
            <li key={t.id}>
              {t.name}, {t.specialty} ({t.level}): {t.tagline}
            </li>
          ))}
        </ul>
      </header>
      <ClientRoot />
    </>
  );
}
