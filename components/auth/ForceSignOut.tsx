"use client";

import { useEffect } from "react";
import { useClerk, useAuth } from "@clerk/nextjs";

/**
 * ForceSignOut
 *
 * Ensures users must always authenticate from scratch when they open
 * the sign-in page in a new browser session (i.e. after closing the tab).
 *
 * Strategy:
 *  - sessionStorage (cleared when the tab/browser is closed) holds a flag
 *    `nexus_session_active` that is set to "1" only while the user is
 *    actively logged in and navigating within the app.
 *  - When this component mounts on the sign-in page:
 *      • If the flag is absent (fresh browser session or tab was closed)
 *        AND Clerk still has a live session, we sign out immediately so
 *        the user is forced to enter their credentials again.
 *      • If the flag is present the user deliberately navigated back to
 *        /sign-in (e.g. to switch accounts), so we still sign them out
 *        and clear the flag — they must sign in again.
 *  - The flag is set by a separate SessionKeepAlive component that lives
 *    inside the editor layout.
 */
export default function ForceSignOut() {
  const { signOut } = useClerk();
  const { isLoaded, isSignedIn } = useAuth();

  useEffect(() => {
    if (!isLoaded) return;

    // Always sign out any existing session when the sign-in page mounts.
    // This covers:
    //   1. User closes the tab and reopens — sessionStorage is wiped, and
    //      we revoke the Clerk session so stale cookie auth cannot bypass sign-in.
    //   2. User explicitly navigates to /sign-in while already signed in.
    if (isSignedIn) {
      // Clear the keep-alive flag (covers case 1 even when sessionStorage
      // was already empty, making the logic idempotent).
      sessionStorage.removeItem("nexus_session_active");
      signOut(); // Clerk will redirect to afterSignOutUrl (/sign-in) after
                 // the session is revoked, which is the current page — so
                 // the user simply sees the sign-in form with no session.
    } else {
      // No Clerk session — user arrived fresh. Just clear any stale flag.
      sessionStorage.removeItem("nexus_session_active");
    }
  }, [isLoaded, isSignedIn, signOut]);

  // This component renders nothing — it's a pure side-effect component.
  return null;
}