"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth, SignInButton } from "@clerk/nextjs";

const TrashIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    <path d="M10 11v6" />
    <path d="M14 11v6" />
    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
  </svg>
);
const ChartIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="18" y1="20" x2="18" y2="10" />
    <line x1="12" y1="20" x2="12" y2="4" />
    <line x1="6" y1="20" x2="6" y2="14" />
  </svg>
);
const CopyIcon = () => (
  <svg
    width="13"
    height="13"
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
const CheckIcon = () => (
  <svg
    width="13"
    height="13"
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
const LinkIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
  </svg>
);

function StatCard({ label, value, accent }) {
  return (
    <div className="card" style={{ padding: "20px 22px" }}>
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          color: "var(--text-subtle)",
          letterSpacing: "0.07em",
          marginBottom: 8,
          textTransform: "uppercase",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: "var(--font-display)",
          fontWeight: 800,
          fontSize: 32,
          color: accent ? "var(--accent)" : "var(--text)",
          letterSpacing: "-0.04em",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function CopyBtn({ text }) {
  const [done, setDone] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setDone(true);
    setTimeout(() => setDone(false), 1800);
  };
  return (
    <button
      onClick={copy}
      title="Copy short link"
      style={{
        background: "none",
        border: "none",
        cursor: "pointer",
        color: done ? "var(--accent)" : "var(--text-subtle)",
        padding: "4px 6px",
        borderRadius: 6,
        transition: "color 0.2s",
        display: "inline-flex",
        alignItems: "center",
      }}
    >
      {done ? <CheckIcon /> : <CopyIcon />}
    </button>
  );
}

function SkeletonRow() {
  return (
    <tr>
      {[280, 120, 50, 100, 140].map((w, i) => (
        <td key={i} style={{ padding: "16px 20px" }}>
          <div
            style={{
              height: 14,
              width: w,
              borderRadius: 6,
              background: "var(--bg-muted)",
              animation: "shimmer 1.4s linear infinite",
              backgroundImage:
                "linear-gradient(90deg, var(--bg-muted) 0%, var(--border) 50%, var(--bg-muted) 100%)",
              backgroundSize: "200% 100%",
            }}
          />
        </td>
      ))}
    </tr>
  );
}

export default function DashboardPage() {
  const { isLoaded, isSignedIn } = useAuth();
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    if (!isLoaded || !isSignedIn) {
      setLoading(false);
      return;
    }
    fetch("/api/links")
      .then((r) => r.json())
      .then((d) => {
        setLinks(d.links || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [isLoaded, isSignedIn]);

  const handleDelete = async (id) => {
    if (!confirm("Delete this link? This cannot be undone.")) return;
    setDeleting(id);
    await fetch(`/api/links/${id}`, { method: "DELETE" });
    setLinks((prev) => prev.filter((l) => l._id !== id));
    setDeleting(null);
  };

  const totalClicks = links.reduce((s, l) => s + (l.clicks || 0), 0);
  const filtered = links.filter(
    (l) => l.originalUrl?.includes(filter) || l.shortCode?.includes(filter),
  );

  /* ── Not signed in ── */
  if (isLoaded && !isSignedIn) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "60vh",
          gap: 20,
          padding: 24,
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 56 }}>🔒</div>
        <h2
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 28,
            fontWeight: 700,
          }}
        >
          Sign in to view your dashboard
        </h2>
        <p style={{ color: "var(--text-muted)", maxWidth: 400, fontSize: 15 }}>
          Your links, clicks, and analytics are waiting.
        </p>
        <SignInButton mode="modal">
          <button
            className="btn-primary"
            style={{ padding: "12px 28px", fontSize: 15 }}
          >
            Sign in →
          </button>
        </SignInButton>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1060, margin: "0 auto", padding: "48px 24px" }}>
      {/* Header */}
      <div className="animate-fade-up" style={{ marginBottom: 36 }}>
        <h1
          style={{
            fontSize: 38,
            fontWeight: 800,
            letterSpacing: "-0.04em",
            marginBottom: 6,
          }}
        >
          Dashboard
        </h1>
        <p style={{ color: "var(--text-muted)", fontSize: 15 }}>
          All your shortened links and their performance.
        </p>
      </div>

      {/* Stats */}
      <div
        className="animate-fade-up animate-delay-1"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: 14,
          marginBottom: 36,
        }}
      >
        <StatCard label="Total Links" value={loading ? "…" : links.length} />
        <StatCard
          label="Total Clicks"
          value={loading ? "…" : totalClicks}
          accent
        />
        <StatCard
          label="Top Link"
          value={
            !loading && links.length
              ? `/${[...links].sort((a, b) => (b.clicks || 0) - (a.clicks || 0))[0].shortCode}`
              : "—"
          }
        />
        <StatCard
          label="Avg. Clicks"
          value={
            !loading && links.length
              ? (totalClicks / links.length).toFixed(1)
              : "0"
          }
        />
      </div>

      {/* Table card */}
      <div
        className="card animate-fade-up animate-delay-2"
        style={{ overflow: "hidden" }}
      >
        {/* Table toolbar */}
        <div
          style={{
            padding: "16px 22px",
            borderBottom: "1px solid var(--border-soft)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              fontSize: 16,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <LinkIcon /> Your Links
          </div>
          <input
            type="text"
            className="input-base"
            placeholder="Filter links…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            style={{ padding: "8px 14px", fontSize: 13, width: 220 }}
          />
        </div>

        {/* Empty state */}
        {!loading && links.length === 0 && (
          <div style={{ padding: "60px 24px", textAlign: "center" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🔗</div>
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 700,
                fontSize: 20,
                marginBottom: 8,
              }}
            >
              No links yet
            </div>
            <div
              style={{
                color: "var(--text-muted)",
                fontSize: 14,
                marginBottom: 24,
              }}
            >
              Head to the home page and shorten your first URL.
            </div>
            <Link
              href="/"
              className="btn-primary"
              style={{
                padding: "10px 22px",
                fontSize: 14,
                display: "inline-block",
                textDecoration: "none",
              }}
            >
              Create a link →
            </Link>
          </div>
        )}

        {/* Table */}
        {(loading || filtered.length > 0) && (
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontFamily: "var(--font-body)",
                fontSize: 14,
              }}
            >
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border-soft)" }}>
                  {[
                    "Original URL",
                    "Short Link",
                    "Clicks",
                    "Created",
                    "Actions",
                  ].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: "12px 20px",
                        textAlign: "left",
                        fontFamily: "var(--font-mono)",
                        fontSize: 11,
                        fontWeight: 500,
                        letterSpacing: "0.07em",
                        color: "var(--text-subtle)",
                        textTransform: "uppercase",
                        background: "var(--bg-muted)",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* Loading skeletons */}
                {loading && [1, 2, 3, 4].map((i) => <SkeletonRow key={i} />)}

                {/* Data rows */}
                {!loading &&
                  filtered.map((link, idx) => (
                    <tr
                      key={link._id}
                      style={{
                        borderBottom:
                          idx < filtered.length - 1
                            ? "1px solid var(--border-soft)"
                            : "none",
                        transition: "background 0.15s",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background = "var(--bg-muted)")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.background = "transparent")
                      }
                    >
                      {/* Original URL */}
                      <td style={{ padding: "14px 20px", maxWidth: 280 }}>
                        <a
                          href={link.originalUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          title={link.originalUrl}
                          style={{
                            color: "var(--text)",
                            textDecoration: "none",
                            display: "block",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            maxWidth: 260,
                          }}
                        >
                          {link.originalUrl}
                        </a>
                      </td>

                      {/* Short link */}
                      <td style={{ padding: "14px 20px" }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          <a
                            href={link.shortUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              fontFamily: "var(--font-mono)",
                              fontSize: 13,
                              color: "var(--accent)",
                              textDecoration: "none",
                              fontWeight: 500,
                            }}
                          >
                            /{link.customAlias || link.shortCode}
                          </a>
                          <CopyBtn text={link.shortUrl} />
                        </div>
                      </td>

                      {/* Clicks */}
                      <td style={{ padding: "14px 20px" }}>
                        <span
                          style={{
                            fontFamily: "var(--font-display)",
                            fontWeight: 700,
                            fontSize: 17,
                            color:
                              (link.clicks || 0) > 0
                                ? "var(--accent)"
                                : "var(--text-muted)",
                          }}
                        >
                          {(link.clicks || 0).toLocaleString()}
                        </span>
                      </td>

                      {/* Created */}
                      <td
                        style={{
                          padding: "14px 20px",
                          color: "var(--text-muted)",
                          fontFamily: "var(--font-mono)",
                          fontSize: 12,
                        }}
                      >
                        {new Date(link.createdAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: "14px 20px" }}>
                        <div style={{ display: "flex", gap: 6 }}>
                          <Link
                            href={`/analytics/${link.customAlias || link.shortCode}`}
                            title="View analytics"
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 5,
                              padding: "6px 12px",
                              borderRadius: 7,
                              border: "1px solid var(--border)",
                              background: "var(--bg-muted)",
                              color: "var(--text-muted)",
                              fontSize: 12,
                              fontFamily: "var(--font-mono)",
                              textDecoration: "none",
                              transition: "border-color 0.2s, color 0.2s",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.borderColor =
                                "var(--accent)";
                              e.currentTarget.style.color = "var(--accent)";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.borderColor =
                                "var(--border)";
                              e.currentTarget.style.color = "var(--text-muted)";
                            }}
                          >
                            <ChartIcon /> Analytics
                          </Link>
                          <button
                            onClick={() => handleDelete(link._id)}
                            disabled={deleting === link._id}
                            title="Delete link"
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              padding: "6px 10px",
                              borderRadius: 7,
                              border: "1px solid var(--border)",
                              background: "var(--bg-muted)",
                              color: "var(--text-subtle)",
                              cursor: "pointer",
                              opacity: deleting === link._id ? 0.5 : 1,
                              transition: "border-color 0.2s, color 0.2s",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.borderColor =
                                "rgba(200,80,42,0.5)";
                              e.currentTarget.style.color = "var(--accent)";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.borderColor =
                                "var(--border)";
                              e.currentTarget.style.color =
                                "var(--text-subtle)";
                            }}
                          >
                            <TrashIcon />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}

        {/* No filter match */}
        {!loading && links.length > 0 && filtered.length === 0 && (
          <div
            style={{
              padding: "40px 24px",
              textAlign: "center",
              color: "var(--text-muted)",
              fontFamily: "var(--font-mono)",
              fontSize: 13,
            }}
          >
            No links match &quot;{filter}&quot;
          </div>
        )}
      </div>
    </div>
  );
}
