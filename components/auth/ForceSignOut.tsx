"use client";

import { useEffect, useRef } from "react";
import { useClerk, useAuth } from "@clerk/nextjs";

/**
 * ForceSignOut — intentional session terminator for auth pages.
 *
 * Design requirement: every visit to /sign-in or /sign-up must destroy any
 * active session so the user always authenticates manually. This is a
 * deliberate product decision, not a bug.
 *
 * Edge cases handled:
 * - Guard ref prevents double sign-out if the component re-renders before
 *   Clerk's async signOut() resolves.
 * - redirectUrl is set explicitly so Clerk lands back on /sign-in after the
 *   session is destroyed rather than triggering a blank page or loop.
 * - sessionStorage key is cleared so any in-memory session flags are removed
 *   even if signOut() itself fails.
 */
export default function ForceSignOut() {
  const { signOut } = useClerk();
  const { isLoaded, isSignedIn } = useAuth();
  const hasSignedOut = useRef(false);

  useEffect(() => {
    // Wait until Clerk has finished loading session state.
    if (!isLoaded) return;

    // Clear the in-memory session flag unconditionally on every auth-page
    // visit so stale flags never let client-side guards pass.
    sessionStorage.removeItem("nexus_session_active");

    // Only attempt sign-out when there is an active session and we have not
    // already fired sign-out in this render cycle (guard against double calls
    // if isSignedIn flickers or the effect re-runs before completion).
    if (isSignedIn && !hasSignedOut.current) {
      hasSignedOut.current = true;

      signOut({
        // Redirect back to /sign-in after the session is cleared so the user
        // sees the login form rather than a blank page or an unintended route.
        redirectUrl: "/sign-in",
      }).catch(() => {
        // If sign-out fails for any reason (network, Clerk outage), the page
        // stays on /sign-in. The user still sees the sign-in form. The worst
        // outcome is a stale cookie that the server's auth.protect() will
        // reject on the next protected-route request — so this is safe to
        // swallow here.
      });
    }
  }, [isLoaded, isSignedIn, signOut]);

  return null;
}