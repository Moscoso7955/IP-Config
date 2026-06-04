import { ImageResponse } from "next/og";

export const alt = "Owner Vis — map ownership, IP & products as a graph";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Branded social preview shown when the link is shared (iMessage, Slack, etc.).
export default function OpengraphImage() {
  const card = (
    label: string,
    sub: string,
    accent: string,
  ): React.ReactElement => (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 4,
        padding: "16px 22px",
        borderRadius: 18,
        border: `2px solid ${accent}`,
        background: "rgba(255,255,255,0.06)",
        boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
      }}
    >
      <span style={{ fontSize: 18, fontWeight: 700, color: accent, letterSpacing: 2 }}>
        {label.toUpperCase()}
      </span>
      <span style={{ fontSize: 26, fontWeight: 600, color: "#f8fafc" }}>{sub}</span>
    </div>
  );

  const connector = (text: string): React.ReactElement => (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
      <div style={{ display: "flex", width: 54, height: 3, background: "#64748b" }} />
      <span style={{ fontSize: 18, fontWeight: 700, color: "#cbd5e1" }}>{text}</span>
    </div>
  );

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
          backgroundImage:
            "linear-gradient(135deg, #0f172a 0%, #1e1b4b 55%, #312e81 100%)",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <span
            style={{
              fontSize: 24,
              fontWeight: 700,
              letterSpacing: 6,
              color: "#818cf8",
            }}
          >
            OWNERSHIP · IP · PRODUCTS
          </span>
          <span style={{ fontSize: 104, fontWeight: 800, color: "#ffffff", lineHeight: 1 }}>
            Owner Vis
          </span>
          <span style={{ fontSize: 38, fontWeight: 500, color: "#cbd5e1", maxWidth: 760 }}>
            Map who owns what — people, entities, products &amp; IP — as an
            interactive graph.
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          {card("Owner", "Jane Smith", "#60a5fa")}
          {connector("100%")}
          {card("Holding", "Acme LLC", "#a78bfa")}
          {connector("65%")}
          {card("Product", "Widget App", "#34d399")}
        </div>
      </div>
    ),
    { ...size },
  );
}
