import { ImageResponse } from "next/og";
import { getPublicData } from "@/lib/server";
import { TAGLINE } from "@/lib/site";

export const alt = TAGLINE;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  const { settings, teachers } = await getPublicData();
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 80,
        background: "#131312",
        backgroundImage: "radial-gradient(60% 70% at 50% 0%, rgba(45, 212, 191, 0.18), transparent 70%)",
        color: "#ecebe6",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-end", fontSize: 64, fontWeight: 700, letterSpacing: -2 }}>
        {settings.app_name}
        <div
          style={{ width: 14, height: 14, borderRadius: 999, background: "#2dd4bf", marginLeft: 6, marginBottom: 14 }}
        />
      </div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ fontSize: 72, fontWeight: 700, lineHeight: 1.1, letterSpacing: -2, maxWidth: 900 }}>
          {TAGLINE}
        </div>
        <div style={{ marginTop: 24, fontSize: 30, color: "#a6a298" }}>
          Speak or type. Get friendly corrections as you go.
        </div>
      </div>
      <div style={{ display: "flex", gap: 16 }}>
        {teachers.map((t) => (
          <div
            key={t.id}
            style={{
              width: 64,
              height: 64,
              borderRadius: 20,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 30,
              fontWeight: 700,
              color: "#fff",
              background: t.color,
            }}
          >
            {t.name[0]}
          </div>
        ))}
      </div>
    </div>,
    size,
  );
}
