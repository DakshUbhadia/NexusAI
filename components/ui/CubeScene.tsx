"use client";

import React, { useEffect, useRef } from "react";

const SPLINE_SCRIPT_SRC =
  "https://unpkg.com/@splinetool/viewer@1.12.96/build/spline-viewer.js";

const SPLINE_URL =
  "https://prod.spline.design/uhLhvhoH8A61aJuT/scene.splinecode";

const SPLINE_VIEWER_TAG = "spline-viewer";

export default function CubeScene() {
  const hostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (globalThis.window === undefined) return;

    const host = hostRef.current;
    if (!host) return;

    const mountViewer = () => {
      host.replaceChildren();

      const viewer = document.createElement(SPLINE_VIEWER_TAG);
      viewer.setAttribute("url", SPLINE_URL);
      viewer.setAttribute("events-target", "global");

      Object.assign(viewer.style, {
        width:         "100%",
        height:        "100%",
        display:       "block",
        pointerEvents: "auto",
      });

      host.appendChild(viewer);
    };

    const existingScript = document.querySelector<HTMLScriptElement>(
      `script[src='${SPLINE_SCRIPT_SRC}']`
    );

    if (!existingScript) {
      const script    = document.createElement("script");
      script.type     = "module";
      script.src      = SPLINE_SCRIPT_SRC;
      script.async    = true;
      script.onload   = () => {
        if (customElements.get(SPLINE_VIEWER_TAG)) {
          mountViewer();
          return;
        }
        customElements.whenDefined(SPLINE_VIEWER_TAG).then(mountViewer);
      };
      document.head.appendChild(script);
      return;
    }

    if (customElements.get(SPLINE_VIEWER_TAG)) {
      mountViewer();
      return;
    }

    customElements.whenDefined(SPLINE_VIEWER_TAG).then(mountViewer);
  }, []);

  return (
    <div
      ref={hostRef}
      className="absolute inset-0 h-full w-full overflow-hidden"
      aria-hidden="true"
    />
  );
}