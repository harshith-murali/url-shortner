"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth, SignInButton, UserButton } from "@clerk/nextjs";
import { useTheme } from "./ThemeProvider";

function SunIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5"/>
      <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
      <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
    </svg>
  );
}

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/dashboard", label: "Dashboard" },
];

export default function Navbar() {
  const { theme, toggle } = useTheme();
  const pathname = usePathname();
  const { isSignedIn, isLoaded } = useAuth();

  return (
    <header
      style={{
        position: "sticky", top: 0, zIndex: 50,
        background: "var(--surface-1)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        borderBottom: "1px solid var(--border-soft)",
      }}
    >
      <nav
        style={{
          maxWidth: 1160, margin: "0 auto", padding: "0 24px",
          height: 62, display: "flex", alignItems: "center",
          justifyContent: "space-between", gap: 16,
        }}
      >
        {/* Logo */}
        <Link href="/" style={{ display:"flex", alignItems:"center", gap:8, textDecoration:"none", color:"var(--text)" }}>
          <span style={{
            width:32, height:32, borderRadius:8, background:"var(--accent)",
            display:"grid", placeItems:"center", color:"#fff", flexShrink:0,
          }}>
            <LinkIcon />
          </span>
          <span style={{ fontFamily:"var(--font-display)", fontWeight:800, fontSize:18, letterSpacing:"-0.04em" }}>
            Sniply
          </span>
        </Link>

        {/* Nav links */}
        <div style={{ display:"flex", alignItems:"center", gap:4 }}>
          {NAV_LINKS.map(({ href, label }) => {
            const active = pathname === href;
            return (
              <Link key={href} href={href} style={{
                fontFamily:"var(--font-display)", fontWeight:500, fontSize:14,
                padding:"6px 14px", borderRadius:8, textDecoration:"none",
                color: active ? "var(--accent)" : "var(--text-muted)",
                background: active ? "var(--accent-glow)" : "transparent",
                transition:"color 0.2s, background 0.2s",
              }}>
                {label}
              </Link>
            );
          })}
        </div>

        {/* Right: theme toggle + auth */}
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          {/* Theme toggle */}
          <button
            onClick={toggle}
            aria-label="Toggle theme"
            style={{
              width:36, height:36, borderRadius:8,
              border:"1px solid var(--border)", background:"var(--bg-muted)",
              color:"var(--text-muted)", display:"grid", placeItems:"center",
              cursor:"pointer", transition:"color 0.2s, border-color 0.2s",
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor="var(--accent)"; e.currentTarget.style.color="var(--accent)"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor="var(--border)"; e.currentTarget.style.color="var(--text-muted)"; }}
          >
            {theme === "dark" ? <SunIcon /> : <MoonIcon />}
          </button>

          {/*
            ✅ FIX: In Clerk v6+/v7, SignedIn and SignedOut are Server Components
            and cannot be used inside "use client" files.
            Use the useAuth() hook instead and conditionally render.
            Only render once isLoaded=true to avoid auth flash.
          */}
          {isLoaded && (
            !isSignedIn ? (
              <SignInButton mode="modal">
                <button className="btn-primary" style={{ padding:"8px 18px", fontSize:14 }}>
                  Sign in
                </button>
              </SignInButton>
            ) : (
              <UserButton
                appearance={{
                  elements: { userButtonAvatarBox: { width:34, height:34 } },
                }}
              />
            )
          )}
        </div>
      </nav>
    </header>
  );
}