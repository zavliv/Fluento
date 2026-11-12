import { ClientRoot } from "@/components/ClientRoot";
import { SITE } from "@/lib/site";
import { API_URL } from "@/lib/api";
import type { Teacher } from "@/lib/teachers";

async function loadTeachers(): Promise<Teacher[]> {
  try {
    const res = await fetch(`${API_URL}/teachers`, { next: { revalidate: 300 } });
    return res.ok ? ((await res.json()) as Teacher[]) : [];
  } catch {
    return [];
  }
}

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

export default async function Home() {
  const teachers = await loadTeachers();
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
