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
      // Clerk v5+: only afterSignOutUrl is a valid prop on ClerkProvider.
      // afterSignInUrl / afterSignUpUrl were removed in v5 — use
      // NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL and
      // NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL in .env.local instead,
      // or forceRedirectUrl on the <SignIn> / <SignUp> components directly
      // (already set in the auth pages).
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