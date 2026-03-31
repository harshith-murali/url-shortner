import Link from "next/link";

export default function NotFound() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "70vh",
        textAlign: "center",
        padding: "48px 24px",
        gap: 0,
      }}
    >
      {/* Big 404 */}
      <div
        style={{
          fontFamily: "var(--font-display)",
          fontWeight: 800,
          fontSize: "clamp(96px, 18vw, 180px)",
          letterSpacing: "-0.06em",
          lineHeight: 1,
          color: "var(--border)",
          marginBottom: 12,
          userSelect: "none",
        }}
      >
        404
      </div>

      {/* Accent underline */}
      <div
        style={{
          width: 60,
          height: 4,
          borderRadius: 99,
          background: "var(--accent)",
          marginBottom: 28,
        }}
      />

      <h1
        style={{
          fontFamily: "var(--font-display)",
          fontWeight: 800,
          fontSize: "clamp(22px, 4vw, 32px)",
          letterSpacing: "-0.03em",
          marginBottom: 12,
        }}
      >
        Link not found
      </h1>

      <p
        style={{
          color: "var(--text-muted)",
          fontSize: 15,
          maxWidth: 380,
          lineHeight: 1.7,
          marginBottom: 36,
        }}
      >
        This short link doesn&apos;t exist or may have expired. Double-check the URL
        or create a new one.
      </p>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
        <Link
          href="/"
          className="btn-primary"
          style={{
            padding: "12px 26px",
            fontSize: 15,
            textDecoration: "none",
          }}
        >
          Shorten a URL →
        </Link>
        <Link
          href="/dashboard"
          className="btn-ghost"
          style={{
            padding: "12px 22px",
            fontSize: 15,
            textDecoration: "none",
          }}
        >
          My Dashboard
        </Link>
      </div>

      {/* Decorative dots */}
      <div
        aria-hidden
        style={{
          position: "fixed",
          bottom: 80,
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          gap: 8,
          opacity: 0.25,
        }}
      >
        {[1,2,3].map(i => (
          <div
            key={i}
            style={{
              width: 6, height: 6, borderRadius: "50%",
              background: "var(--accent)",
              animation: `fadeIn 0.4s ease ${i * 0.15}s both`,
            }}
          />
        ))}
      </div>
    </div>
  );
}