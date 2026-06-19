import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ClerkProvider } from "@clerk/nextjs";
import LenisProvider from "@/components/editor/providers/LenisProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nexus AI",
  description: "Collaborative agentic planning workspace for software teams.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <ClerkProvider
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      afterSignOutUrl="/sign-in"
    >
      <html lang="en" className="dark">
        <body suppressHydrationWarning>
          <LenisProvider>{children}</LenisProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}