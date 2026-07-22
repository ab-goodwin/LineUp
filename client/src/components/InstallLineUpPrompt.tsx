import { useEffect, useState, type ReactNode } from "react";
import {
  CalendarPlus,
  Download,
  MoreVertical,
  RefreshCw,
  Share,
  Smartphone,
  X,
} from "lucide-react";

import lineupTagline from "@assets/LineUp_tagline_1778180551921.png";

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
  return (
    ua.includes("safari") &&
    !ua.includes("crios") &&
    !ua.includes("fxios") &&
    !ua.includes("edgios")
  );
}

function isAndroid() {
  return /android/i.test(window.navigator.userAgent);
}

function isChromeLike() {
  const ua = window.navigator.userAgent.toLowerCase();
  return (
    ua.includes("chrome") ||
    ua.includes("crios") ||
    ua.includes("edga")
  );
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

    const shouldShowManualPrompt = isIOS() || !isAndroid();
    let timer: number | undefined;

    if (shouldShowManualPrompt) {
      timer = window.setTimeout(() => {
        if (!isStandaloneMode()) setShowPrompt(true);
      }, 1400);
    }

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );

      if (timer) {
        window.clearTimeout(timer);
      }
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

    if (showInstructions) {
      setShowPrompt(false);
      return;
    }

    setShowInstructions(true);
  }

  function dismissPrompt() {
    localStorage.setItem("lineup-install-dismissed", "true");
    setShowPrompt(false);
  }

  function closeForNow() {
    setShowPrompt(false);
  }

  if (!showPrompt) return null;

  const iosSafari = isIOS() && isSafari();
  const androidChrome = isAndroid() && isChromeLike();

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 py-6 md:hidden">
      <button
        type="button"
        aria-label="Close install prompt"
        onClick={closeForNow}
        className="absolute inset-0 bg-[#2B211C]/35 backdrop-blur-[2px]"
      />

      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="install-lineup-title"
        className="relative z-10 flex max-h-[calc(100dvh-2rem)] w-full max-w-[390px] flex-col overflow-hidden rounded-[28px] border border-[#D99869] bg-[#FFF9F1] shadow-[0_24px_70px_rgba(65,40,25,0.28)]"
      >
        <div className="h-2 shrink-0 bg-[#ED4D19]" />

        <div className="relative shrink-0 border-b border-[#D99869] px-6 pb-4 pt-6 text-center">
          <button
            type="button"
            onClick={closeForNow}
            aria-label="Close install prompt"
            className="absolute right-5 top-5 rounded-full p-2 text-[#8C5536] transition hover:bg-[#F4E6D7]"
          >
            <X className="h-6 w-6" />
          </button>

          <img
            src={lineupTagline}
            alt="LineUp — Your Dances. Your Stats."
            className="mx-auto h-auto w-[230px] max-w-[72%] object-contain"
          />
        </div>

        <div className="overflow-y-auto px-5 pb-5 pt-5">
          <h2
            id="install-lineup-title"
            className="text-center font-display text-[26px] font-bold leading-tight text-[#201A16]"
          >
            Add LineUp to your Home Screen
          </h2>

          <p className="mx-auto mt-2 max-w-[320px] text-center text-sm leading-5 text-[#8D593A]">
            Open LineUp as an app without going through the app store.
          </p>

          {!showInstructions ? (
            <div className="mt-6 space-y-4">
              <BenefitRow
                icon={<CalendarPlus className="h-7 w-7" />}
                text="Log Dances/Sessions Faster"
              />
              <BenefitRow
                icon={<Smartphone className="h-7 w-7" />}
                text="Get The Full App Experience"
              />
              <BenefitRow
                icon={<RefreshCw className="h-7 w-7" />}
                text="No Updates or Ads Required"
              />
            </div>
          ) : (
            <div className="mt-6 rounded-[22px] border border-[#E0B183] bg-[#FBF4EA] px-5 py-5 text-[#5E4435]">
              {iosSafari ? (
                <>
                  <div className="mb-4 flex items-center gap-3">
                    <Share className="h-6 w-6 text-[#EB4D1B]" />
                    <h3 className="text-lg font-extrabold text-[#251B16]">
                      iPhone Safari
                    </h3>
                  </div>

                  <ol className="space-y-3 text-[17px] leading-6">
                    <li className="flex gap-3">
                      <span className="font-semibold">1.</span>
                      <span>Tap the Share icon at the bottom of Safari.</span>
                    </li>
                    <li className="flex gap-3">
                      <span className="font-semibold">2.</span>
                      <span>Scroll down and tap Add to Home Screen.</span>
                    </li>
                    <li className="flex gap-3">
                      <span className="font-semibold">3.</span>
                      <span>Tap Add.</span>
                    </li>
                  </ol>
                </>
              ) : androidChrome ? (
                <>
                  <div className="mb-4 flex items-center gap-3">
                    <Download className="h-6 w-6 text-[#EB4D1B]" />
                    <h3 className="text-lg font-extrabold text-[#251B16]">
                      Android Chrome
                    </h3>
                  </div>

                  <ol className="space-y-3 text-[17px] leading-6">
                    <li className="flex gap-3">
                      <span className="font-semibold">1.</span>
                      <span>Tap Install LineUp.</span>
                    </li>
                    <li className="flex gap-3">
                      <span className="font-semibold">2.</span>
                      <span>Confirm Install.</span>
                    </li>
                    <li className="flex gap-3">
                      <span className="font-semibold">3.</span>
                      <span>Open LineUp from your Home Screen.</span>
                    </li>
                  </ol>
                </>
              ) : (
                <>
                  <div className="mb-4 flex items-center gap-3">
                    <MoreVertical className="h-6 w-6 text-[#EB4D1B]" />
                    <h3 className="text-lg font-extrabold text-[#251B16]">
                      Mobile Browser
                    </h3>
                  </div>

                  <ol className="space-y-3 text-[17px] leading-6">
                    <li className="flex gap-3">
                      <span className="font-semibold">1.</span>
                      <span>Open your browser menu.</span>
                    </li>
                    <li className="flex gap-3">
                      <span className="font-semibold">2.</span>
                      <span>Choose Add to Home Screen or Install App.</span>
                    </li>
                    <li className="flex gap-3">
                      <span className="font-semibold">3.</span>
                      <span>Confirm the install.</span>
                    </li>
                  </ol>
                </>
              )}
            </div>
          )}

          <p className="mx-auto mt-6 max-w-[320px] text-center text-sm font-normal leading-5 text-[#8D593A]">
            Built to stay free. No ads. No subscriptions.
            <br />
            Just your LineUp.
          </p>

          <div className="mt-6 grid grid-cols-[1fr_auto] gap-3">
            <button
              type="button"
              onClick={handlePrimaryAction}
              className="rounded-[18px] bg-[#ED4D19] px-4 py-4 text-base font-black uppercase tracking-[0.08em] text-white shadow-sm transition hover:bg-[#C83E13] active:scale-[0.99]"
            >
              {deferredPrompt
                ? "Install LineUp"
                : showInstructions
                  ? "Got It"
                  : "Show Me How"}
            </button>

            <button
              type="button"
              onClick={dismissPrompt}
              className="rounded-[18px] border-2 border-[#D99B6D] bg-[#FFF9F1] px-5 py-4 text-base font-medium text-[#7A4A31] transition hover:bg-[#F7EBDD]"
            >
              Not Now
            </button>
          </div>

          <button
            type="button"
            onClick={closeForNow}
            className="mt-4 w-full text-center text-sm font-normal leading-5 text-[#8D593A] transition hover:text-[#E84C1C]"
          >
            Continue to LineUp
          </button>
        </div>
      </section>
    </div>
  );
}

function BenefitRow({
  icon,
  text,
}: {
  icon: ReactNode;
  text: string;
}) {
  return (
    <div className="flex items-center gap-4">
      <div className="flex h-[58px] w-[58px] shrink-0 items-center justify-center rounded-[20px] border border-[#EDC59F] bg-[#F2D2B5] text-[#EB4D1B] shadow-[inset_0_-3px_0_rgba(194,126,76,0.12)]">
        {icon}
      </div>

      <p className="text-[19px] font-semibold leading-tight text-[#8A5537]">
        {text}
      </p>
    </div>
  );
}