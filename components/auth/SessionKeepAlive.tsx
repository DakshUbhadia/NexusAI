"use client";

import { useEffect } from "react";

/**
 * SessionKeepAlive
 *
 * Place this component inside the editor layout. While it is mounted it
 * writes a flag to sessionStorage so ForceSignOut on the sign-in page
 * knows whether the user is in an ongoing browser session or has just
 * opened a fresh tab.
 *
 * sessionStorage is automatically cleared when the tab/window is closed,
 * which is the trigger we rely on to force re-authentication.
 */
export default function SessionKeepAlive() {
  useEffect(() => {
    // Mark the session as active in this browser tab.
    sessionStorage.setItem("nexus_session_active", "1");

    // Clear the flag when the component unmounts (navigating away from editor).
    return () => {
      sessionStorage.removeItem("nexus_session_active");
    };
  }, []);

  return null;
}