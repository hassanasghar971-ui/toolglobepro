import { ImageResponse } from "next/og";
import { BrandMark } from "@/lib/brand-mark";
import { BRAND, SITE } from "@/lib/site";

export const alt = `${SITE.name} – ${SITE.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  const host = SITE.url.replace(/^https?:\/\//, "");
  const chips = ["100% in-browser", "Files up to 600MB", "No sign-up"];

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          color: "#fff",
          background: `linear-gradient(135deg, ${BRAND.dark} 0%, #1e1b4b 55%, #0e4a5c 100%)`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          <BrandMark size={120} radius={30} />
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontSize: 64, fontWeight: 800, letterSpacing: -2 }}>
              ToolGlobe Pro
            </div>
            <div style={{ display: "flex", fontSize: 26, color: "#a5b4fc" }}>{host}</div>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div
            style={{
              display: "flex",
              fontSize: 76,
              fontWeight: 800,
              lineHeight: 1.05,
              letterSpacing: -2,
              maxWidth: 1000,
            }}
          >
            Free online tools that never upload your files
          </div>
          <div style={{ display: "flex", gap: 16 }}>
            {chips.map((c) => (
              <div
                key={c}
                style={{
                  display: "flex",
                  padding: "10px 22px",
                  borderRadius: 999,
                  fontSize: 26,
                  background: "rgba(255,255,255,0.12)",
                  border: "1px solid rgba(255,255,255,0.25)",
                }}
              >
                {c}
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
