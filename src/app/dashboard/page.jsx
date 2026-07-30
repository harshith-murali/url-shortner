"use client";
import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useAuth, SignInButton } from "@clerk/nextjs";

/* ── Icons ── */
const TrashIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    <path d="M10 11v6" /><path d="M14 11v6" />
    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
  </svg>
);
const ChartIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10" />
    <line x1="12" y1="20" x2="12" y2="4" />
    <line x1="6" y1="20" x2="6" y2="14" />
  </svg>
);
const CopyIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);
const CheckIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);
const LinkIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
  </svg>
);
const EditIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);

/* ── Sub-components ── */

function StatCard({ label, value, accent }) {
  return (
    <div className="card" style={{ padding: "20px 22px" }}>
      <div style={{
        fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-subtle)",
        letterSpacing: "0.07em", marginBottom: 8, textTransform: "uppercase",
      }}>
        {label}
      </div>
      <div style={{
        fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 32,
        color: accent ? "var(--accent)" : "var(--text)", letterSpacing: "-0.04em",
      }}>
        {value}
      </div>
    </div>
  );
}

function CopyBtn({ text }) {
  const [done, setDone] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setDone(true);
      setTimeout(() => setDone(false), 1800);
    } catch {
      // Clipboard access denied — silently ignore
    }
  };
  return (
    <button
      onClick={copy}
      type="button"
      aria-label="Copy short link"
      title="Copy short link"
      style={{
        background: "none", border: "none", cursor: "pointer",
        color: done ? "var(--accent)" : "var(--text-subtle)",
        padding: "4px 6px", borderRadius: 6, transition: "color 0.2s",
        display: "inline-flex", alignItems: "center",
      }}
    >
      {done ? <CheckIcon /> : <CopyIcon />}
    </button>
  );
}

function SkeletonRow() {
  return (
    <tr>
      {[280, 120, 50, 100, 80, 140].map((w, i) => (
        <td key={i} style={{ padding: "16px 20px" }}>
          <div style={{
            height: 14, width: w, borderRadius: 6,
            background: "var(--bg-muted)",
            animation: "shimmer 1.4s linear infinite",
            backgroundImage: "linear-gradient(90deg, var(--bg-muted) 0%, var(--border) 50%, var(--bg-muted) 100%)",
            backgroundSize: "200% 100%",
          }} />
        </td>
      ))}
    </tr>
  );
}

/* ── Edit Modal ── */
function EditModal({ link, onClose, onSave }) {
  const [alias, setAlias]     = useState(link.customAlias || "");
  const [expiry, setExpiry]   = useState("never");
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState("");

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/links/${link._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customAlias: alias || null,
          expiresIn: expiry === "never" ? null : expiry,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to save changes.");
        return;
      }
      onSave(data);
      onClose();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Edit link"
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="card" style={{ width: "100%", maxWidth: 440, padding: "28px 28px 24px" }}>
        <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 20, marginBottom: 20 }}>
          Edit Link
        </h2>

        <div style={{ marginBottom: 16 }}>
          <label htmlFor="edit-alias" style={{ display: "block", fontSize: 12, fontFamily: "var(--font-mono)", color: "var(--text-muted)", marginBottom: 6, letterSpacing: "0.04em" }}>
            CUSTOM ALIAS
          </label>
          <input
            id="edit-alias"
            type="text"
            className="input-base"
            value={alias}
            onChange={(e) => setAlias(e.target.value.replace(/\s/g, "-").toLowerCase())}
            placeholder="my-link (optional)"
            style={{ width: "100%", padding: "10px 14px", fontSize: 14 }}
          />
        </div>

        <div style={{ marginBottom: 24 }}>
          <label htmlFor="edit-expiry" style={{ display: "block", fontSize: 12, fontFamily: "var(--font-mono)", color: "var(--text-muted)", marginBottom: 6, letterSpacing: "0.04em" }}>
            EXPIRY
          </label>
          <select
            id="edit-expiry"
            value={expiry}
            onChange={(e) => setExpiry(e.target.value)}
            className="input-base"
            style={{ width: "100%", padding: "10px 14px", fontSize: 14, cursor: "pointer" }}
          >
            <option value="never">Never</option>
            <option value="1">1 day</option>
            <option value="7">7 days</option>
            <option value="30">30 days</option>
          </select>
        </div>

        {error && (
          <div style={{
            marginBottom: 16, padding: "10px 14px",
            background: "rgba(200,80,42,0.08)", border: "1px solid rgba(200,80,42,0.25)",
            borderRadius: 8, fontSize: 13, color: "var(--accent)", fontFamily: "var(--font-mono)",
          }}>
            ⚠ {error}
          </div>
        )}

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button
            type="button"
            onClick={onClose}
            className="btn-ghost"
            style={{ padding: "9px 18px", fontSize: 14 }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="btn-primary"
            style={{ padding: "9px 20px", fontSize: 14, opacity: saving ? 0.7 : 1 }}
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Main Page ── */

export default function DashboardPage() {
  const { isLoaded, isSignedIn } = useAuth();
  const [links, setLinks]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [deleting, setDeleting]  = useState(null);
  const [deleteError, setDeleteError] = useState("");
  const [filter, setFilter]   = useState("");
  const [editingLink, setEditingLink] = useState(null);

  useEffect(() => {
    if (!isLoaded) return;

    // Not signed in — stop loading without a network request
    if (!isSignedIn) {
      // Schedule via setTimeout to avoid synchronous setState inside effect
      // (React Compiler lint: react-hooks/set-state-in-effect)
      const id = setTimeout(() => setLoading(false), 0);
      return () => clearTimeout(id);
    }

    fetch("/api/links")
      .then((r) => {
        if (!r.ok) throw new Error(`Server error (${r.status})`);
        return r.json();
      })
      .then((d) => {
        setLinks(d.links || []);
        setLoading(false);
      })
      .catch((err) => {
        setFetchError(err.message || "Failed to load links.");
        setLoading(false);
      });
  }, [isLoaded, isSignedIn]);

  const handleDelete = async (id) => {
    if (!confirm("Delete this link? This cannot be undone.")) return;
    setDeleting(id);
    setDeleteError("");
    try {
      const res = await fetch(`/api/links/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setDeleteError(data.error || "Failed to delete link.");
        return;
      }
      // Only remove from local state after confirmed server success
      setLinks((prev) => prev.filter((l) => l._id !== id));
    } catch {
      setDeleteError("Network error. Please try again.");
    } finally {
      setDeleting(null);
    }
  };

  const handleEditSave = (updated) => {
    setLinks((prev) => prev.map((l) => (l._id === updated._id ? { ...l, ...updated } : l)));
  };

  const totalClicks = useMemo(
    () => links.reduce((s, l) => s + (l.clicks || 0), 0),
    [links]
  );

  // Top link: computed once, not on every render — uses customAlias when present
  const topLink = useMemo(() => {
    if (!links.length) return null;
    const best = [...links].sort((a, b) => (b.clicks || 0) - (a.clicks || 0))[0];
    return `/${best.customAlias || best.shortCode}`;
  }, [links]);

  // Case-insensitive filter across originalUrl, shortCode, and customAlias
  const filtered = useMemo(() => {
    if (!filter) return links;
    const q = filter.toLowerCase();
    return links.filter(
      (l) =>
        l.originalUrl?.toLowerCase().includes(q) ||
        l.shortCode?.toLowerCase().includes(q) ||
        l.customAlias?.toLowerCase().includes(q)
    );
  }, [links, filter]);

  /* ── Not signed in ── */
  if (isLoaded && !isSignedIn) {
    return (
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", minHeight: "60vh", gap: 20, padding: 24, textAlign: "center",
      }}>
        <div style={{ fontSize: 56 }}>🔒</div>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 700 }}>
          Sign in to view your dashboard
        </h2>
        <p style={{ color: "var(--text-muted)", maxWidth: 400, fontSize: 15 }}>
          Your links, clicks, and analytics are waiting.
        </p>
        <SignInButton mode="modal">
          <button type="button" className="btn-primary" style={{ padding: "12px 28px", fontSize: 15 }}>
            Sign in →
          </button>
        </SignInButton>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1060, margin: "0 auto", padding: "48px 24px" }}>
      {/* Edit modal */}
      {editingLink && (
        <EditModal
          link={editingLink}
          onClose={() => setEditingLink(null)}
          onSave={handleEditSave}
        />
      )}

      {/* Header */}
      <div className="animate-fade-up" style={{ marginBottom: 36 }}>
        <h1 style={{ fontSize: 38, fontWeight: 800, letterSpacing: "-0.04em", marginBottom: 6 }}>
          Dashboard
        </h1>
        <p style={{ color: "var(--text-muted)", fontSize: 15 }}>
          All your shortened links and their performance.
        </p>
      </div>

      {/* Stats */}
      <div
        className="animate-fade-up animate-delay-1"
        style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14, marginBottom: 36 }}
      >
        <StatCard label="Total Links"  value={loading ? "…" : links.length} />
        <StatCard label="Total Clicks" value={loading ? "…" : totalClicks} accent />
        <StatCard label="Top Link"     value={!loading && topLink ? topLink : "—"} />
        <StatCard
          label="Avg. Clicks"
          value={!loading && links.length ? (totalClicks / links.length).toFixed(1) : "0"}
        />
      </div>

      {/* Delete error */}
      {deleteError && (
        <div style={{
          marginBottom: 16, padding: "11px 16px",
          background: "rgba(200,80,42,0.08)", border: "1px solid rgba(200,80,42,0.25)",
          borderRadius: 8, fontSize: 13, color: "var(--accent)", fontFamily: "var(--font-mono)",
        }}>
          ⚠ {deleteError}
          <button type="button" onClick={() => setDeleteError("")}
            aria-label="Dismiss error"
            style={{ marginLeft: 12, background: "none", border: "none", cursor: "pointer", color: "inherit", fontSize: 13 }}>
            ✕
          </button>
        </div>
      )}

      {/* Table card */}
      <div className="card animate-fade-up animate-delay-2" style={{ overflow: "hidden" }}>
        {/* Toolbar */}
        <div style={{
          padding: "16px 22px", borderBottom: "1px solid var(--border-soft)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          gap: 12, flexWrap: "wrap",
        }}>
          <div style={{
            fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 16,
            display: "flex", alignItems: "center", gap: 8,
          }}>
            <LinkIcon /> Your Links
          </div>
          <label htmlFor="dashboard-filter" style={{ display: "none" }}>Filter links</label>
          <input
            id="dashboard-filter"
            type="search"
            className="input-base"
            placeholder="Filter links…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            style={{ padding: "8px 14px", fontSize: 13, width: 220 }}
          />
        </div>

        {/* Fetch error */}
        {fetchError && !loading && (
          <div style={{ padding: "40px 24px", textAlign: "center" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 14, color: "var(--accent)", marginBottom: 8 }}>
              {fetchError}
            </div>
            <button
              type="button"
              className="btn-primary"
              style={{ marginTop: 12, padding: "10px 22px", fontSize: 14 }}
              onClick={() => window.location.reload()}
            >
              Retry
            </button>
          </div>
        )}

        {/* Empty state */}
        {!loading && !fetchError && links.length === 0 && (
          <div style={{ padding: "60px 24px", textAlign: "center" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🔗</div>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 20, marginBottom: 8 }}>
              No links yet
            </div>
            <div style={{ color: "var(--text-muted)", fontSize: 14, marginBottom: 24 }}>
              Head to the home page and shorten your first URL.
            </div>
            <Link href="/" className="btn-primary" style={{ padding: "10px 22px", fontSize: 14, display: "inline-block", textDecoration: "none" }}>
              Create a link →
            </Link>
          </div>
        )}

        {/* Table */}
        {(loading || filtered.length > 0) && (
          <div style={{ overflowX: "auto" }}>
            <table
              role="table"
              aria-label="Your shortened links"
              style={{ width: "100%", borderCollapse: "collapse", fontFamily: "var(--font-body)", fontSize: 14 }}
            >
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border-soft)" }}>
                  {["Original URL", "Short Link", "Clicks", "Expires", "Created", "Actions"].map((h) => (
                    <th key={h} scope="col" style={{
                      padding: "12px 20px", textAlign: "left",
                      fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 500,
                      letterSpacing: "0.07em", color: "var(--text-subtle)",
                      textTransform: "uppercase", background: "var(--bg-muted)",
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* Loading skeletons */}
                {loading && [1, 2, 3, 4].map((i) => <SkeletonRow key={i} />)}

                {/* Data rows */}
                {!loading && filtered.map((link, idx) => (
                  <tr
                    key={link._id}
                    style={{
                      borderBottom: idx < filtered.length - 1 ? "1px solid var(--border-soft)" : "none",
                      transition: "background 0.15s",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-muted)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    {/* Original URL */}
                    <td style={{ padding: "14px 20px", maxWidth: 280 }}>
                      <a
                        href={link.originalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={link.originalUrl}
                        style={{
                          color: "var(--text)", textDecoration: "none",
                          display: "block", overflow: "hidden",
                          textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 260,
                        }}
                      >
                        {link.originalUrl}
                      </a>
                    </td>

                    {/* Short link */}
                    <td style={{ padding: "14px 20px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <a
                          href={link.shortUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--accent)", textDecoration: "none", fontWeight: 500 }}
                        >
                          /{link.customAlias || link.shortCode}
                        </a>
                        <CopyBtn text={link.shortUrl} />
                      </div>
                    </td>

                    {/* Clicks */}
                    <td style={{ padding: "14px 20px" }}>
                      <span style={{
                        fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 17,
                        color: (link.clicks || 0) > 0 ? "var(--accent)" : "var(--text-muted)",
                      }}>
                        {(link.clicks || 0).toLocaleString()}
                      </span>
                    </td>

                    {/* Expiry */}
                    <td style={{ padding: "14px 20px", fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-muted)" }}>
                      {link.expiresAt
                        ? new Date(link.expiresAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
                        : <span style={{ opacity: 0.5 }}>Never</span>
                      }
                    </td>

                    {/* Created */}
                    <td style={{ padding: "14px 20px", color: "var(--text-muted)", fontFamily: "var(--font-mono)", fontSize: 12 }}>
                      {new Date(link.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </td>

                    {/* Actions */}
                    <td style={{ padding: "14px 20px" }}>
                      <div style={{ display: "flex", gap: 6 }}>
                        <Link
                          href={`/analytics/${link.customAlias || link.shortCode}`}
                          aria-label={`View analytics for /${link.customAlias || link.shortCode}`}
                          style={{
                            display: "inline-flex", alignItems: "center", gap: 5,
                            padding: "6px 12px", borderRadius: 7,
                            border: "1px solid var(--border)", background: "var(--bg-muted)",
                            color: "var(--text-muted)", fontSize: 12, fontFamily: "var(--font-mono)",
                            textDecoration: "none", transition: "border-color 0.2s, color 0.2s",
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.color = "var(--accent)"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text-muted)"; }}
                        >
                          <ChartIcon /> Analytics
                        </Link>
                        <button
                          type="button"
                          onClick={() => setEditingLink(link)}
                          aria-label={`Edit /${link.customAlias || link.shortCode}`}
                          style={{
                            display: "inline-flex", alignItems: "center",
                            padding: "6px 10px", borderRadius: 7,
                            border: "1px solid var(--border)", background: "var(--bg-muted)",
                            color: "var(--text-subtle)", cursor: "pointer",
                            transition: "border-color 0.2s, color 0.2s",
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--accent-2)"; e.currentTarget.style.color = "var(--accent-2)"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text-subtle)"; }}
                        >
                          <EditIcon />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(link._id)}
                          disabled={deleting === link._id}
                          aria-label={`Delete /${link.customAlias || link.shortCode}`}
                          title="Delete link"
                          style={{
                            display: "inline-flex", alignItems: "center",
                            padding: "6px 10px", borderRadius: 7,
                            border: "1px solid var(--border)", background: "var(--bg-muted)",
                            color: "var(--text-subtle)", cursor: "pointer",
                            opacity: deleting === link._id ? 0.5 : 1,
                            transition: "border-color 0.2s, color 0.2s",
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(200,80,42,0.5)"; e.currentTarget.style.color = "var(--accent)"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text-subtle)"; }}
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
          <div style={{ padding: "40px 24px", textAlign: "center", color: "var(--text-muted)", fontFamily: "var(--font-mono)", fontSize: 13 }}>
            No links match &quot;{filter}&quot;
          </div>
        )}
      </div>

      {/* Anonymous-link messaging */}
      <div style={{ marginTop: 24, padding: "14px 18px", background: "var(--bg-muted)", border: "1px solid var(--border-soft)", borderRadius: 10, fontSize: 13, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
        💡 Links created without signing in are anonymous — they work but cannot be managed here.{" "}
        <Link href="/" style={{ color: "var(--accent)", textDecoration: "none" }}>Create a new link</Link> while signed in to manage it from this dashboard.
      </div>
    </div>
  );
}
