"use client";

import { useEffect } from "react";

export default function SessionKeepAlive() {
  useEffect(() => {
    sessionStorage.setItem("nexus_session_active", "1");

    return () => {
      sessionStorage.removeItem("nexus_session_active");
    };
  }, []);

  return null;
}