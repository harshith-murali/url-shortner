import { ThemeProvider } from "@/components/ThemeProvider";
import ClerkThemeWrapper from "@/components/ClerkThemeWrapper";
import Navbar from "@/components/Navbar";
import "./globals.css";

export const metadata = {
  title: "Sniply — Smart URL Shortener",
  description: "Shorten links, track clicks, and understand your audience.",
  icons: { icon: "/favicon.ico" },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
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