"use client";

import React from "react";

export default function DevErrorLogger() {
  React.useEffect(() => {
    const onErr = (e: ErrorEvent) => {
      // Surface more detail in console when Next overlay is terse
      // eslint-disable-next-line no-console
      console.error("Window error:", e.message, e.error || "", e.filename, e.lineno, e.colno);
    };
    const onRej = (e: PromiseRejectionEvent) => {
      // eslint-disable-next-line no-console
      console.error("Unhandled rejection:", e.reason);
    };
    window.addEventListener("error", onErr);
    window.addEventListener("unhandledrejection", onRej);
    return () => {
      window.removeEventListener("error", onErr);
      window.removeEventListener("unhandledrejection", onRej);
    };
  }, []);
  return null;
}

