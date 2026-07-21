import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "./App";
import "./index.css";
import { installAuthFetch } from "./lib/authFetch";

installAuthFetch();

let isReloadingForUpdate = false;

if ("serviceWorker" in navigator && import.meta.env.PROD) {
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (isReloadingForUpdate) return;

    isReloadingForUpdate = true;
    window.location.reload();
  });

  const updateSW = registerSW({
    immediate: true,

    onRegisteredSW(_serviceWorkerUrl, registration) {
      if (!registration) return;

      registration.update().catch((error) => {
        console.error("PWA update check failed:", error);
      });
    },

    onNeedRefresh() {
      updateSW(true);
    },

    onRegisterError(error) {
      console.error("Service worker registration failed:", error);
    },
  });

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState !== "visible") return;

    navigator.serviceWorker
      .getRegistration()
      .then((registration) => registration?.update())
      .catch((error) => {
        console.error("PWA resume update check failed:", error);
      });
  });
}

createRoot(document.getElementById("root")!).render(<App />);