"use client";
import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { useTheme } from "@/components/ThemeProvider";

export default function ClerkThemeWrapper({ children }) {
  const { theme } = useTheme();

  return (
    <ClerkProvider
      appearance={{
        baseTheme: theme === "dark" ? dark : undefined,
        variables: {
          colorPrimary: "#e05a2b", // replace with your exact --accent hex
        },
        elements: {
          // keeps the modal card consistent with your design
          card: {
            boxShadow: "0 8px 40px rgba(0,0,0,0.18)",
            borderRadius: "12px",
          },
        },
      }}
    >
      {children}
    </ClerkProvider>
  );
}