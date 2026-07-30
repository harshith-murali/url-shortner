"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

/* ── Tiny bar chart (pure CSS) ── */
function MiniBar({ label, count, max, color }) {
  const pct = max > 0 ? (count / max) * 100 : 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
      <div style={{
        fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-muted)",
        width: 90, flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
      }} title={label}>
        {label}
      </div>
      <div style={{ flex: 1, height: 8, borderRadius: 99, background: "var(--bg-muted)", overflow: "hidden" }}>
        <div style={{
          height: "100%", borderRadius: 99, width: `${pct}%`,
          background: color || "var(--accent)",
          transition: "width 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)",
        }} />
      </div>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-muted)", width: 28, textAlign: "right" }}>
        {count}
      </div>
    </div>
  );
}

/* ── Click timeline (simple SVG sparkline) ── */
function Sparkline({ data }) {
  if (!data || data.length === 0) return null;
  const max = Math.max(...data.map((d) => d.count), 1);
  const W = 500, H = 80;
  const pts = data.map((d, i) => {
    const x = (i / (data.length - 1 || 1)) * W;
    const y = H - (d.count / max) * (H - 10) - 4;
    return `${x},${y}`;
  });
  const area = `M${pts.join(" L")} L${W},${H} L0,${H} Z`;
  const line = `M${pts.join(" L")}`;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      style={{ width: "100%", height: 80 }}
      aria-hidden
    >
      <defs>
        <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="var(--accent)" stopOpacity="0.25" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.01" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#sparkGrad)" />
      <path d={line} fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function StatTile({ label, value, mono }) {
  return (
    <div className="card" style={{ padding: "18px 20px" }}>
      <div style={{
        fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.08em",
        color: "var(--text-subtle)", textTransform: "uppercase", marginBottom: 8,
      }}>
        {label}
      </div>
      <div style={{
        fontFamily: mono ? "var(--font-mono)" : "var(--font-display)",
        fontWeight: 800, fontSize: 26, color: "var(--text)", letterSpacing: "-0.03em",
      }}>
        {value}
      </div>
    </div>
  );
}

/* ── QR Modal ── */
function QRModal({ shortUrl, onClose }) {
  const [qrDataUrl, setQrDataUrl] = useState(null);
  const [qrError, setQrError]     = useState("");

  useEffect(() => {
    import("qrcode")
      .then((QRCode) =>
        QRCode.default.toDataURL(shortUrl, { width: 300, margin: 2, color: { dark: "#1a1814", light: "#fffdf8" } })
      )
      .then((url) => setQrDataUrl(url))
      .catch(() => setQrError("QR generation failed."));
  }, [shortUrl]);

  const handleDownload = () => {
    if (!qrDataUrl) return;
    const a = document.createElement("a");
    a.href = qrDataUrl;
    a.download = `sniply-qr.png`;
    a.click();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="QR code"
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="card" style={{ padding: "28px", textAlign: "center", maxWidth: 360, width: "100%" }}>
        <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 18, marginBottom: 20 }}>
          QR Code
        </h2>
        {qrError ? (
          <p style={{ color: "var(--accent)", fontFamily: "var(--font-mono)", fontSize: 13 }}>{qrError}</p>
        ) : qrDataUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={qrDataUrl} alt={`QR code for ${shortUrl}`} style={{ width: 240, height: 240, borderRadius: 8, marginBottom: 16 }} />
        ) : (
          <div style={{ width: 240, height: 240, background: "var(--bg-muted)", borderRadius: 8, margin: "0 auto 16px", display: "grid", placeItems: "center" }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", border: "3px solid var(--border)", borderTopColor: "var(--accent)", animation: "spin-slow 0.9s linear infinite" }} />
          </div>
        )}
        <p style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-muted)", marginBottom: 16, wordBreak: "break-all" }}>
          {shortUrl}
        </p>
        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          <button type="button" onClick={handleDownload} disabled={!qrDataUrl} className="btn-primary" style={{ padding: "9px 20px", fontSize: 14 }}>
            Download
          </button>
          <button type="button" onClick={onClose} className="btn-ghost" style={{ padding: "9px 18px", fontSize: 14 }}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Main Page ── */

export default function AnalyticsPage() {
  const { shortCode } = useParams();
  const [data, setData]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");
  const [showQR, setShowQR]     = useState(false);

  useEffect(() => {
    fetch(`/api/analytics/${shortCode}`)
      .then((r) => {
        if (!r.ok) return r.json().then((d) => { throw new Error(d.error || `Error ${r.status}`); });
        return r.json();
      })
      .then((d) => { setData(d); setLoading(false); })
      .catch((err) => { setError(err.message || "Failed to load analytics."); setLoading(false); });
  }, [shortCode]);

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh", flexDirection: "column", gap: 16 }}>
      <div style={{ width: 36, height: 36, borderRadius: "50%", border: "3px solid var(--border)", borderTopColor: "var(--accent)", animation: "spin-slow 0.9s linear infinite" }} />
      <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--text-muted)" }}>Loading analytics…</span>
    </div>
  );

  if (error) return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh", gap: 16, textAlign: "center" }}>
      <div style={{ fontSize: 52 }}>⚠️</div>
      <h2 style={{ fontFamily: "var(--font-display)", fontSize: 26 }}>{error}</h2>
      <Link href="/dashboard" style={{ color: "var(--accent)", fontFamily: "var(--font-mono)", fontSize: 13 }}>
        ← Back to dashboard
      </Link>
    </div>
  );

  const { link, clicks, timeline, browserBreakdown, deviceBreakdown, osBreakdown, referrerBreakdown } = data;

  const maxBrowser  = Math.max(...(browserBreakdown  || []).map((b) => b.count), 1);
  const maxDevice   = Math.max(...(deviceBreakdown   || []).map((b) => b.count), 1);
  const maxOs       = Math.max(...(osBreakdown       || []).map((b) => b.count), 1);
  const maxReferrer = Math.max(...(referrerBreakdown || []).map((b) => b.count), 1);

  const handleExport = () => {
    window.location.href = `/api/analytics/${shortCode}/export`;
  };

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: "48px 24px" }}>
      {showQR && <QRModal shortUrl={link.shortUrl} onClose={() => setShowQR(false)} />}

      {/* ── Breadcrumb ── */}
      <nav aria-label="Breadcrumb" className="animate-fade-in" style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-subtle)", marginBottom: 28, display: "flex", alignItems: "center", gap: 6 }}>
        <Link href="/dashboard" style={{ color: "var(--text-muted)", textDecoration: "none" }}>Dashboard</Link>
        <span aria-hidden>›</span>
        <span style={{ color: "var(--accent)" }}>/{shortCode}</span>
      </nav>

      {/* ── Title + actions ── */}
      <div className="animate-fade-up" style={{ marginBottom: 32, display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            background: "var(--bg-muted)", border: "1px solid var(--border)",
            borderRadius: 8, padding: "6px 14px", marginBottom: 14,
          }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--accent)", fontWeight: 500 }}>
              {link.shortUrl}
            </span>
          </div>
          <h1 style={{ fontSize: "clamp(26px, 4vw, 38px)", fontWeight: 800, letterSpacing: "-0.04em", marginBottom: 8 }}>
            Link Analytics
          </h1>
          <a
            href={link.originalUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--text-muted)",
              textDecoration: "none", display: "block", overflow: "hidden",
              textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 600,
            }}
            title={link.originalUrl}
          >
            {link.originalUrl}
          </a>
        </div>
        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
          <button
            type="button"
            onClick={() => setShowQR(true)}
            aria-label="Generate QR code"
            className="btn-ghost"
            style={{ padding: "8px 16px", fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}
          >
            📷 QR Code
          </button>
          <button
            type="button"
            onClick={handleExport}
            aria-label="Export analytics as CSV"
            className="btn-ghost"
            style={{ padding: "8px 16px", fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}
          >
            ↓ Export CSV
          </button>
        </div>
      </div>

      {/* ── Stat tiles ── */}
      <div className="animate-fade-up animate-delay-1" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14, marginBottom: 28 }}>
        <StatTile label="Total Clicks" value={link.clicks} />
        <StatTile label="Short Code"   value={`/${shortCode}`} mono />
        <StatTile
          label="Created"
          value={new Date(link.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
          mono
        />
        <StatTile label="Status" value={link.isActive ? "Active" : "Inactive"} />
      </div>

      {/* ── Sparkline ── */}
      <div className="card animate-fade-up animate-delay-2" style={{ padding: "22px 24px", marginBottom: 24 }}>
        <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 15, marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span>Clicks over time</span>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-subtle)", fontWeight: 400 }}>
            last {timeline?.length || 0} days
          </span>
        </div>
        {timeline && timeline.length > 0
          ? <Sparkline data={timeline} />
          : <div style={{ color: "var(--text-subtle)", fontFamily: "var(--font-mono)", fontSize: 13, padding: "20px 0" }}>No click data yet.</div>
        }
      </div>

      {/* ── Breakdown grid ── */}
      <div className="animate-fade-up animate-delay-3" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 18 }}>
        <div className="card" style={{ padding: "22px 24px" }}>
          <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 15, marginBottom: 18 }}>🌐 Browser</div>
          {(browserBreakdown || []).length === 0
            ? <span style={{ color: "var(--text-subtle)", fontSize: 13, fontFamily: "var(--font-mono)" }}>No data</span>
            : browserBreakdown.map((b) => <MiniBar key={b._id} label={b._id || "Unknown"} count={b.count} max={maxBrowser} color="var(--accent)" />)
          }
        </div>
        <div className="card" style={{ padding: "22px 24px" }}>
          <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 15, marginBottom: 18 }}>📱 Device</div>
          {(deviceBreakdown || []).length === 0
            ? <span style={{ color: "var(--text-subtle)", fontSize: 13, fontFamily: "var(--font-mono)" }}>No data</span>
            : deviceBreakdown.map((b) => <MiniBar key={b._id} label={b._id || "Unknown"} count={b.count} max={maxDevice} color="var(--accent-2)" />)
          }
        </div>
        <div className="card" style={{ padding: "22px 24px" }}>
          <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 15, marginBottom: 18 }}>💻 OS</div>
          {(osBreakdown || []).length === 0
            ? <span style={{ color: "var(--text-subtle)", fontSize: 13, fontFamily: "var(--font-mono)" }}>No data</span>
            : osBreakdown.map((b) => <MiniBar key={b._id} label={b._id || "Unknown"} count={b.count} max={maxOs} color="#c87a2a" />)
          }
        </div>
        <div className="card" style={{ padding: "22px 24px" }}>
          <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 15, marginBottom: 18 }}>🔗 Referrer</div>
          {(referrerBreakdown || []).length === 0
            ? <span style={{ color: "var(--text-subtle)", fontSize: 13, fontFamily: "var(--font-mono)" }}>No data</span>
            : referrerBreakdown.map((b) => <MiniBar key={b._id} label={b._id || "Direct"} count={b.count} max={maxReferrer} color="#2a8ec8" />)
          }
        </div>
      </div>

      {/* ── Recent clicks ── */}
      {clicks && clicks.length > 0 && (
        <div className="card animate-fade-up animate-delay-4" style={{ marginTop: 24, overflow: "hidden" }}>
          <div style={{ padding: "16px 22px", borderBottom: "1px solid var(--border-soft)", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 15 }}>
            Recent Clicks
          </div>
          <div style={{ overflowX: "auto" }}>
            <table
              role="table"
              aria-label="Recent clicks"
              style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, fontFamily: "var(--font-mono)" }}
            >
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border-soft)" }}>
                  {["Time", "Browser", "OS", "Device", "Referrer"].map((h) => (
                    <th key={h} scope="col" style={{
                      padding: "10px 18px", textAlign: "left", fontSize: 10,
                      letterSpacing: "0.07em", textTransform: "uppercase",
                      color: "var(--text-subtle)", background: "var(--bg-muted)",
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {clicks.slice(0, 10).map((c, i) => (
                  <tr
                    key={c._id}
                    style={{ borderBottom: i < 9 ? "1px solid var(--border-soft)" : "none" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-muted)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <td style={{ padding: "10px 18px", color: "var(--text-muted)" }}>
                      {new Date(c.createdAt).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })}
                    </td>
                    <td style={{ padding: "10px 18px" }}>{c.browser || "—"}</td>
                    <td style={{ padding: "10px 18px" }}>{c.os     || "—"}</td>
                    <td style={{ padding: "10px 18px" }}>{c.device || "—"}</td>
                    <td style={{ padding: "10px 18px", color: "var(--text-muted)" }}>
                      {c.referrer ? (
                        <span title={c.referrer} style={{ display: "block", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {c.referrer}
                        </span>
                      ) : "Direct"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="animate-fade-up animate-delay-5" style={{ marginTop: 28, textAlign: "center" }}>
        <Link href="/dashboard" style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--text-muted)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6 }}>
          ← Back to dashboard
        </Link>
      </div>
    </div>
  );
}