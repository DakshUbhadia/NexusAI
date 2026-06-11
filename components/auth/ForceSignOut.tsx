"use client";

import { useEffect } from "react";
import { useClerk, useAuth } from "@clerk/nextjs";

export default function ForceSignOut() {
  const { signOut } = useClerk();
  const { isLoaded, isSignedIn } = useAuth();

  useEffect(() => {
    if (!isLoaded) return;

    if (isSignedIn) {

      sessionStorage.removeItem("nexus_session_active");
      signOut();
    } else {
      sessionStorage.removeItem("nexus_session_active");
    }
  }, [isLoaded, isSignedIn, signOut]);

  return null;
}