import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "./App";
import "./index.css";
import { installAuthFetch } from "./lib/authFetch";

installAuthFetch();

if ("serviceWorker" in navigator && import.meta.env.PROD) {
  let updateReloadStarted = false;

  const reloadAfterUpdate = () => {
    if (updateReloadStarted) return;

    updateReloadStarted = true;

    window.setTimeout(() => {
      window.location.reload();
    }, 250);
  };

  const updateSW = registerSW({
    immediate: true,

    onRegisteredSW(_serviceWorkerUrl, registration) {
      if (!registration) return;

      registration.update().catch((error) => {
        console.error("PWA update check failed:", error);
      });
    },

    onNeedRefresh() {
      updateSW(true)
        .then(() => {
          reloadAfterUpdate();
        })
        .catch((error) => {
          console.error("PWA activation failed:", error);
        });
    },

    onRegisterError(error) {
      console.error("Service worker registration failed:", error);
    },
  });

  navigator.serviceWorker.addEventListener("controllerchange", () => {
    reloadAfterUpdate();
  });

  const checkForUpdate = async () => {
    try {
      const registration =
        await navigator.serviceWorker.getRegistration();

      if (!registration) return;

      await registration.update();

      if (registration.waiting) {
        await updateSW(true);
        reloadAfterUpdate();
      }
    } catch (error) {
      console.error("PWA update check failed:", error);
    }
  };

  window.addEventListener("pageshow", () => {
    void checkForUpdate();
  });

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      void checkForUpdate();
    }
  });
}

createRoot(document.getElementById("root")!).render(<App />);