"use client";

import { useEffect } from "react";

/**
 * Rejestracja service workera. Cache trzyma powłokę aplikacji, więc przy
 * słabym zasięgu na siłowni ekran treningu wciąż się otwiera.
 */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch((error) => {
        console.warn("Nie udało się zarejestrować service workera", error);
      });
    };

    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
  }, []);

  return null;
}
