import { BRAND } from "./site";

/**
 * Logo mark built from plain divs so it renders reliably inside next/og (Satori).
 * Used by icon.tsx, apple-icon.tsx and opengraph-image.tsx.
 */
export function BrandMark({ size, radius }: { size: number; radius: number }) {
  const globe = Math.round(size * 0.52);
  const stroke = Math.max(2, Math.round(size * 0.05));
  const spark = Math.round(size * 0.1);

  return (
    <div
      style={{
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        borderRadius: radius,
        background: `linear-gradient(135deg, ${BRAND.from}, ${BRAND.to})`,
      }}
    >
      <div
        style={{
          display: "flex",
          position: "absolute",
          width: globe,
          height: globe,
          borderRadius: "50%",
          border: `${stroke}px solid #ffffff`,
        }}
      />
      <div
        style={{
          display: "flex",
          position: "absolute",
          width: Math.round(globe * 0.45),
          height: globe,
          borderRadius: "50%",
          border: `${stroke}px solid #ffffff`,
        }}
      />
      <div
        style={{
          display: "flex",
          position: "absolute",
          width: globe,
          height: stroke,
          background: "#ffffff",
        }}
      />
      <div
        style={{
          display: "flex",
          position: "absolute",
          top: Math.round(size * 0.13),
          right: Math.round(size * 0.13),
          width: spark,
          height: spark,
          background: "#ffffff",
          transform: "rotate(45deg)",
        }}
      />
    </div>
  );
}
