import { useEffect, useState } from "react";
import { Share, X, Smartphone, Download, MoreVertical } from "lucide-react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isStandaloneMode() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isMobileDevice() {
  return window.matchMedia("(max-width: 768px)").matches;
}

function isIOS() {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

function isSafari() {
  const ua = window.navigator.userAgent.toLowerCase();
  return ua.includes("safari") && !ua.includes("crios") && !ua.includes("fxios");
}

function isAndroid() {
  return /android/i.test(window.navigator.userAgent);
}

function isChromeLike() {
  const ua = window.navigator.userAgent.toLowerCase();
  return ua.includes("chrome") || ua.includes("crios");
}

export function InstallLineUpPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);

  const [showPrompt, setShowPrompt] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!isMobileDevice()) return;
    if (isStandaloneMode()) return;
    if (localStorage.getItem("lineup-install-dismissed") === "true") return;

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      window.setTimeout(() => setShowPrompt(true), 1200);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // iPhone Safari usually does not fire beforeinstallprompt,
    // so we show manual instructions after the app has loaded.
    const shouldShowManualPrompt = isIOS() || !isAndroid();

    let timer: number | undefined;

    if (shouldShowManualPrompt) {
      timer = window.setTimeout(() => {
        if (!isStandaloneMode()) setShowPrompt(true);
      }, 1400);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      if (timer) window.clearTimeout(timer);
    };
  }, []);

  async function handlePrimaryAction() {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;

      if (choice.outcome === "accepted") {
        setShowPrompt(false);
      }

      setDeferredPrompt(null);
      return;
    }

    setShowInstructions(true);
  }

  function dismissPrompt() {
    localStorage.setItem("lineup-install-dismissed", "true");
    setShowPrompt(false);
  }

  if (!showPrompt) return null;

  const iosSafari = isIOS() && isSafari();
  const androidChrome = isAndroid() && isChromeLike();

  return (
    <div className="fixed inset-x-4 bottom-[92px] z-[80] md:hidden">
      <div className="overflow-hidden rounded-[28px] border border-[#D39A72] bg-[#FFF9F1] shadow-[0_10px_30px_rgba(83,52,34,0.18)]">
        <div className="h-2 bg-[#E45524]" />

        <div className="p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[#E4C7A8] bg-[#F3D2B6] text-[#E45524]">
              <Smartphone className="h-6 w-6" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#8A5637]">
                    LineUp App
                  </p>
                  <h2 className="mt-1 text-xl font-extrabold leading-tight text-[#241814]">
                    Add LineUp to your Home Screen
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={dismissPrompt}
                  aria-label="Dismiss install prompt"
                  className="rounded-full p-1.5 text-[#8A5637] hover:bg-[#F6E8D3]"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <p className="mt-2 text-sm leading-5 text-[#7A5A46]">
                Open LineUp like an app, without going through the app store.
              </p>
            </div>
          </div>

          {showInstructions && (
            <div className="mt-4 rounded-2xl border border-[#E4C7A8] bg-[#F8F1E8] p-4 text-sm text-[#5F4434]">
              {iosSafari ? (
                <>
                  <div className="mb-3 flex items-center gap-2 font-bold text-[#241814]">
                    <Share className="h-4 w-4 text-[#E45524]" />
                    iPhone Safari
                  </div>
                  <ol className="list-decimal space-y-2 pl-5">
                    <li>Tap the Share icon at the bottom of Safari.</li>
                    <li>Scroll down and tap Add to Home Screen.</li>
                    <li>Tap Add.</li>
                  </ol>
                </>
              ) : androidChrome ? (
                <>
                  <div className="mb-3 flex items-center gap-2 font-bold text-[#241814]">
                    <Download className="h-4 w-4 text-[#E45524]" />
                    Android Chrome
                  </div>
                  <ol className="list-decimal space-y-2 pl-5">
                    <li>Tap Install LineUp.</li>
                    <li>Confirm Install.</li>
                    <li>Open LineUp from your Home Screen.</li>
                  </ol>
                </>
              ) : (
                <>
                  <div className="mb-3 flex items-center gap-2 font-bold text-[#241814]">
                    <MoreVertical className="h-4 w-4 text-[#E45524]" />
                    Mobile browser
                  </div>
                  <ol className="list-decimal space-y-2 pl-5">
                    <li>Open your browser menu.</li>
                    <li>Choose Add to Home Screen or Install App.</li>
                    <li>Confirm the install.</li>
                  </ol>
                </>
              )}
            </div>
          )}

          <div className="mt-5 flex gap-2">
            <button
              type="button"
              onClick={handlePrimaryAction}
              className="flex-1 rounded-2xl bg-[#E45524] px-4 py-3 text-sm font-extrabold uppercase tracking-[0.08em] text-white shadow-sm hover:bg-[#B83E18]"
            >
              {deferredPrompt ? "Install LineUp" : "Show Me How"}
            </button>

            <button
              type="button"
              onClick={dismissPrompt}
              className="rounded-2xl border border-[#D39A72] bg-[#FFF9F1] px-4 py-3 text-sm font-bold text-[#8A5637] hover:bg-[#F6E8D3]"
            >
              Not Now
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowPrompt(false)}
            className="mt-3 w-full text-center text-xs font-semibold text-[#8A5637] underline-offset-4 hover:underline"
          >
            Continue to LineUp
          </button>
        </div>
      </div>
    </div>
  );
}
