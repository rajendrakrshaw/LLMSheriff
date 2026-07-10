"use client";

import { useEffect } from "react";

import { portfolioApiBaseUrl } from "@/lib/site";

const SESSION_KEY = "llmsheriff_visit_logged";

export function VisitNotifier() {
  useEffect(() => {
    if (sessionStorage.getItem(SESSION_KEY)) return;

    const page = `llmsheriff${window.location.pathname}`;

    fetch(`${portfolioApiBaseUrl}/visit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        page,
        referrer: document.referrer || "",
      }),
      keepalive: true,
    })
      .then(() => sessionStorage.setItem(SESSION_KEY, "1"))
      .catch(() => {});
  }, []);

  return null;
}
