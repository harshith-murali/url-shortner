"use client";
import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { useTheme } from "@/components/ThemeProvider";

export default function ClerkThemeWrapper({ children }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return (
    <ClerkProvider
      appearance={{
        baseTheme: isDark ? dark : undefined,
        variables: {
          colorPrimary: "#e05a2b",
          colorBackground: isDark ? "#111111" : "#ffffff",
          colorText: isDark ? "#f0f0f0" : "#111111",
          colorTextSecondary: isDark ? "#a0a0a0" : "#555555",
          colorInputBackground: isDark ? "#1e1e1e" : "#f9f9f9",
          colorInputText: isDark ? "#f0f0f0" : "#111111",
          colorNeutral: isDark ? "#ffffff" : "#111111",
        },
        elements: {
          card: {
            backgroundColor: isDark ? "#111111" : "#ffffff",
            border: isDark ? "1px solid #2a2a2a" : "1px solid #e5e5e5",
            boxShadow: isDark
              ? "0 8px 40px rgba(0,0,0,0.6)"
              : "0 8px 40px rgba(0,0,0,0.12)",
            borderRadius: "12px",
          },
          modalBackdrop: {
            backgroundColor: isDark ? "rgba(0,0,0,0.7)" : "rgba(0,0,0,0.4)",
            backdropFilter: "blur(4px)",
          },
          headerTitle: {
            color: isDark ? "#f0f0f0" : "#111111",
          },
          headerSubtitle: {
            color: isDark ? "#a0a0a0" : "#555555",
          },
          dividerLine: {
            backgroundColor: isDark ? "#2a2a2a" : "#e5e5e5",
          },
          dividerText: {
            color: isDark ? "#a0a0a0" : "#555555",
          },
          formFieldLabel: {
            color: isDark ? "#f0f0f0" : "#111111",
          },
          footerActionText: {
            color: isDark ? "#a0a0a0" : "#555555",
          },
          footerActionLink: {
            color: "#e05a2b",
          },
          identityPreviewText: {
            color: isDark ? "#f0f0f0" : "#111111",
          },
          formButtonPrimary: {
            backgroundColor: "#e05a2b",
            "&:hover": { backgroundColor: "#c94e22" },
          },
        },
      }}
    >
      {children}
    </ClerkProvider>
  );
}