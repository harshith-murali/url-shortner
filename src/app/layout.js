import { ThemeProvider } from "@/components/ThemeProvider";
import ClerkThemeWrapper from "@/components/ClerkThemeWrapper";
import Navbar from "@/components/Navbar";
import { Syne, DM_Mono, Instrument_Sans } from "next/font/google";
import "./globals.css";

/*
 * Fonts loaded via next/font/google (replaces CSS @import).
 * next/font downloads fonts at build time, serves them self-hosted,
 * and eliminates the Google Fonts preconnect round-trips needed with CSS @import.
 */
const syne = Syne({
  subsets:  ["latin"],
  weight:   ["400", "500", "600", "700", "800"],
  variable: "--font-display",
  display:  "swap",
});

const dmMono = DM_Mono({
  subsets:  ["latin"],
  weight:   ["300", "400", "500"],
  style:    ["normal", "italic"],
  variable: "--font-mono",
  display:  "swap",
});

const instrumentSans = Instrument_Sans({
  subsets:  ["latin"],
  weight:   ["400", "500", "600"],
  style:    ["normal", "italic"],
  variable: "--font-body",
  display:  "swap",
});

export const metadata = {
  title:       "Sniply — Smart URL Shortener",
  description: "Shorten links, track clicks, and understand your audience.",
  icons:       { icon: "/favicon.ico" },
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${syne.variable} ${dmMono.variable} ${instrumentSans.variable}`}
    >
      <body>
        {/* ThemeProvider must wrap ClerkProvider so the theme context is available */}
        <ThemeProvider>
          <ClerkThemeWrapper>
            <Navbar />
            <main style={{ minHeight: "calc(100vh - 62px)" }}>
              {children}
            </main>
            <Footer />
          </ClerkThemeWrapper>
        </ThemeProvider>
      </body>
    </html>
  );
}

function Footer() {
  return (
    <footer
      style={{
        borderTop: "1px solid var(--border-soft)",
        padding: "28px 24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        color: "var(--text-subtle)",
        fontSize: 13,
        fontFamily: "var(--font-mono)",
      }}
    >
      <span>© {new Date().getFullYear()} Sniply</span>
      <span style={{ opacity: 0.4 }}>·</span>
      <span>Built with Next.js &amp; MongoDB</span>
    </footer>
  );
}