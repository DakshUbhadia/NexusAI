"use client";

import { useEffect, useRef } from "react";
import { useClerk, useAuth } from "@clerk/nextjs";

function isActiveClerkCallback(): boolean {
  if (typeof window === "undefined") return false;

  const { pathname, search } = new URL(window.location.href);

  if (
    pathname.includes("/sso-callback") ||
    pathname.includes("/oauth-callback") ||
    pathname.includes("/verify-email-address") ||
    pathname.includes("/verify-phone-number") ||
    pathname.includes("/factor-one") ||
    pathname.includes("/factor-two") ||
    pathname.includes("/continue") ||
    pathname.includes("/reset-password")
  ) {
    return true;
  }

  if (
    search.includes("__clerk_status") ||
    search.includes("__clerk_created_session") ||
    search.includes("rotating_token_nonce") ||
    search.includes("clerk_ticket") ||
    search.includes("__clerk_db_jwt")
  ) {
    return true;
  }

  return false;
}

export default function ForceSignOut() {
  const { signOut } = useClerk();
  const { isLoaded, isSignedIn } = useAuth();
  const hasSignedOut = useRef(false);

  useEffect(() => {
    if (!isLoaded) return;

    if (isActiveClerkCallback()) return;

    sessionStorage.removeItem("nexus_session_active");

    if (isSignedIn && !hasSignedOut.current) {
      hasSignedOut.current = true;

      signOut({
        redirectUrl: "/sign-in",
      }).catch(() => {});
    }
  }, [isLoaded, isSignedIn, signOut]);

  return null;
}