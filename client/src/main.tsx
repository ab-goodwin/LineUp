import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "./App";
import "./index.css";
import { installAuthFetch } from "./lib/authFetch";

installAuthFetch();

if ("serviceWorker" in navigator && import.meta.env.PROD) {
  let isReloadingForUpdate = false;

  const updateSW = registerSW({
    immediate: true,

    onRegisteredSW(_serviceWorkerUrl, registration) {
      if (!registration) return;

      // Let the page and initial API requests begin first.
      window.setTimeout(() => {
        registration.update().catch((error) => {
          console.error("PWA update check failed:", error);
        });
      }, 1500);
    },

    onNeedRefresh() {
      updateSW(true).catch((error) => {
        console.error("PWA activation failed:", error);
      });
    },

    onRegisterError(error) {
      console.error("Service worker registration failed:", error);
    },
  });

  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (isReloadingForUpdate) return;

    isReloadingForUpdate = true;
    window.location.reload();
  });
}

createRoot(document.getElementById("root")!).render(<App />);