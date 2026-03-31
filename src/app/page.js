"use client";
import { useState } from "react";
import Link from "next/link";

/* ── Tiny icons ── */
const CheckIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="20 6 9 17 4 12" />
  </svg>
);
const CopyIcon = () => (
  <svg
    width="15"
    height="15"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="9" y="9" width="13" height="13" rx="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);
const ArrowIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </svg>
);
const SparkleIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" />
  </svg>
);

const FEATURES = [
  {
    icon: "⚡",
    title: "Instant Shortening",
    desc: "Generate short links in milliseconds. No fuss, no friction.",
  },
  {
    icon: "📊",
    title: "Click Analytics",
    desc: "Track every visit — device, browser, referrer, and over time.",
  },
  {
    icon: "🔒",
    title: "Secure & Persistent",
    desc: "Links tied to your account, stored safely in MongoDB.",
  },
  {
    icon: "🎯",
    title: "Custom Aliases",
    desc: "Choose your own slug instead of a random code.",
  },
];

export default function HomePage() {
  const [url, setUrl] = useState("");
  const [alias, setAlias] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [showAlias, setShowAlias] = useState(false);

  const handleShorten = async (e) => {
    e.preventDefault();
    setError("");
    setResult(null);
    if (!url.trim()) {
      setError("Please enter a URL.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/shorten", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          originalUrl: url,
          customAlias: alias || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        console.log("API ERROR:", data);
        throw new Error(data?.error || "Request failed");
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong");
      setResult(data);
      setUrl("");
      setAlias("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(result.shortUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ position: "relative", overflow: "hidden" }}>
      {/* ── Decorative blobs ── */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          top: -120,
          right: -80,
          width: 500,
          height: 500,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, var(--accent-glow) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />
      <div
        aria-hidden
        style={{
          position: "absolute",
          top: 200,
          left: -120,
          width: 380,
          height: 380,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(42,110,200,0.10) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      {/* ── Grid bg ── */}
      <div
        className="grid-bg"
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.35,
          pointerEvents: "none",
        }}
      />

      {/* ── Hero ── */}
      <section
        style={{
          maxWidth: 760,
          margin: "0 auto",
          padding: "80px 24px 56px",
          textAlign: "center",
          position: "relative",
        }}
      >
        {/* Pill badge */}
        <div
          className="animate-fade-up"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            background: "var(--bg-muted)",
            border: "1px solid var(--border)",
            borderRadius: 99,
            padding: "5px 14px",
            fontSize: 12,
            fontFamily: "var(--font-mono)",
            color: "var(--accent)",
            marginBottom: 28,
            letterSpacing: "0.06em",
          }}
        >
          <SparkleIcon /> LINK INTELLIGENCE PLATFORM
        </div>

        <h1
          className="animate-fade-up animate-delay-1"
          style={{
            fontSize: "clamp(42px, 7vw, 76px)",
            fontWeight: 800,
            marginBottom: 20,
            letterSpacing: "-0.04em",
          }}
        >
          Short links, <span className="shimmer-text">big insights.</span>
        </h1>

        <p
          className="animate-fade-up animate-delay-2"
          style={{
            fontSize: "clamp(16px, 2vw, 19px)",
            color: "var(--text-muted)",
            maxWidth: 540,
            margin: "0 auto 48px",
            lineHeight: 1.7,
          }}
        >
          Sniply turns any URL into a crisp short link you can track, analyze,
          and share — in under a second.
        </p>

        {/* ── Shortener Form Card ── */}
        <div
          className="card animate-fade-up animate-delay-3"
          style={{
            padding: "32px 28px",
            textAlign: "left",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Accent stripe */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: 3,
              background:
                "linear-gradient(90deg, var(--accent), var(--accent-2))",
            }}
          />

          <form onSubmit={handleShorten}>
            {/* Main URL input */}
            <div
              style={{
                display: "flex",
                gap: 10,
                flexWrap: "wrap",
                marginBottom: 12,
              }}
            >
              <input
                type="text"
                className="input-base"
                placeholder="Paste your long URL here…"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                style={{ flex: 1, minWidth: 200, padding: "13px 16px" }}
              />
              <button
                type="submit"
                className="btn-primary"
                disabled={loading}
                style={{
                  padding: "13px 28px",
                  fontSize: 15,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  opacity: loading ? 0.7 : 1,
                }}
              >
                {loading ? (
                  <span
                    style={{ display: "flex", alignItems: "center", gap: 8 }}
                  >
                    <span
                      style={{
                        width: 16,
                        height: 16,
                        borderRadius: "50%",
                        border: "2px solid rgba(255,255,255,0.3)",
                        borderTopColor: "#fff",
                        animation: "spin-slow 0.8s linear infinite",
                        display: "inline-block",
                      }}
                    />
                    Shortening…
                  </span>
                ) : (
                  <span
                    style={{ display: "flex", alignItems: "center", gap: 8 }}
                  >
                    Shorten <ArrowIcon />
                  </span>
                )}
              </button>
            </div>

            {/* Custom alias toggle */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: showAlias ? 12 : 0,
              }}
            >
              <button
                type="button"
                onClick={() => setShowAlias((p) => !p)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontFamily: "var(--font-mono)",
                  fontSize: 12,
                  color: "var(--accent)",
                  padding: "0 2px",
                  letterSpacing: "0.03em",
                }}
              >
                {showAlias ? "− Hide" : "+ Add"} custom alias
              </button>
            </div>

            {showAlias && (
              <div
                style={{
                  display: "flex",
                  gap: 10,
                  alignItems: "center",
                  flexWrap: "wrap",
                }}
              >
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 13,
                    color: "var(--text-muted)",
                    whiteSpace: "nowrap",
                  }}
                >
                  {process.env.NEXT_PUBLIC_BASE_URL || "https://sniply.app"}/
                </span>
                <input
                  type="text"
                  className="input-base"
                  placeholder="my-link"
                  value={alias}
                  onChange={(e) =>
                    setAlias(e.target.value.replace(/\s/g, "-").toLowerCase())
                  }
                  style={{
                    flex: 1,
                    minWidth: 140,
                    padding: "10px 14px",
                    fontSize: 13,
                  }}
                />
              </div>
            )}
          </form>

          {/* ── Error ── */}
          {error && (
            <div
              style={{
                marginTop: 16,
                padding: "11px 16px",
                background: "rgba(200,80,42,0.08)",
                border: "1px solid rgba(200,80,42,0.25)",
                borderRadius: 8,
                fontSize: 14,
                color: "var(--accent)",
                fontFamily: "var(--font-mono)",
              }}
            >
              ⚠ {error}
            </div>
          )}

          {/* ── Result ── */}
          {result && (
            <div
              style={{
                marginTop: 20,
                padding: "16px 18px",
                background: "var(--bg-muted)",
                border: "1px solid var(--border)",
                borderRadius: 10,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 11,
                    fontFamily: "var(--font-mono)",
                    color: "var(--text-subtle)",
                    marginBottom: 4,
                    letterSpacing: "0.06em",
                  }}
                >
                  YOUR SHORT LINK
                </div>
                <a
                  href={result.shortUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontWeight: 500,
                    fontSize: 16,
                    color: "var(--accent)",
                    textDecoration: "none",
                    letterSpacing: "0.01em",
                  }}
                >
                  {result.shortUrl}
                </a>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={handleCopy}
                  className="btn-ghost"
                  style={{
                    padding: "8px 14px",
                    fontSize: 13,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  {copied ? (
                    <>
                      <CheckIcon /> Copied!
                    </>
                  ) : (
                    <>
                      <CopyIcon /> Copy
                    </>
                  )}
                </button>
                <Link
                  href="/dashboard"
                  style={{
                    fontFamily: "var(--font-display)",
                    fontWeight: 600,
                    fontSize: 13,
                    padding: "8px 14px",
                    borderRadius: 8,
                    background: "var(--accent-glow)",
                    color: "var(--accent)",
                    textDecoration: "none",
                    border: "1px solid rgba(200,80,42,0.2)",
                  }}
                >
                  View analytics →
                </Link>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── Features ── */}
      <section
        style={{ maxWidth: 1000, margin: "0 auto", padding: "20px 24px 80px" }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 18,
          }}
        >
          {FEATURES.map((f, i) => (
            <div
              key={f.title}
              className="card card-hover animate-fade-up"
              style={{ padding: "24px 22px", animationDelay: `${0.1 * i}s` }}
            >
              <div style={{ fontSize: 28, marginBottom: 12 }}>{f.icon}</div>
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontWeight: 700,
                  fontSize: 16,
                  marginBottom: 8,
                  color: "var(--text)",
                }}
              >
                {f.title}
              </div>
              <div
                style={{
                  fontSize: 14,
                  color: "var(--text-muted)",
                  lineHeight: 1.65,
                }}
              >
                {f.desc}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
