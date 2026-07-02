import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { FadeImg } from "@/components/FadeImg";

import recapImg from "@/assets/onboarding/onboarding-recap.png";
import calendarImg from "@/assets/onboarding/onboarding-calendar.png";
import libraryImg from "@/assets/onboarding/onboarding-library.png";
import crewImg from "@/assets/onboarding/onboarding-crew.png";
import bucklesImg from "@/assets/onboarding/onboarding-buckles.png";

const ONBOARDING_KEY = "lineup_onboarding_seen";
export const WALKTHROUGH_EVENT = "lineup:show-walkthrough";

const PAGES = [
  {
    id: "recap",
    image: recapImg,
    title: "Welcome to LineUp",
    body: "Track your dance nights, see your stats, and watch your LineUp grow over time.",
  },
  {
    id: "calendar",
    image: calendarImg,
    title: "Log Your Dance Nights",
    body: "Use the Calendar to add sessions, pick a location, and record the dances you did that night.",
  },
  {
    id: "library",
    image: libraryImg,
    title: "Build Your Dance Library",
    body: "Add line dances and swing dances to your Library so they're ready to check off during a session.",
  },
  {
    id: "crew",
    image: crewImg,
    title: "Add Your Crew",
    body: "Use Crew to find friends, compare stats, and start dance challenges or showdowns.",
  },
  {
    id: "buckles",
    image: bucklesImg,
    title: "Earn Your Buckles",
    body: "Unlock achievements as you dance more, visit new places, build streaks, and challenge your crew.",
  },
] as const;

interface Props {
  userId: number;
}

export function OnboardingCarousel({ userId }: Props) {
  const storageKey = `${ONBOARDING_KEY}_${userId}`;
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [dontShow, setDontShow] = useState(false);
  const [dir, setDir] = useState<1 | -1>(1);

  useEffect(() => {
    if (!localStorage.getItem(storageKey)) {
      setOpen(true);
    }
  }, [storageKey]);

  useEffect(() => {
    const handler = () => {
      setOpen(true);
      setPage(0);
      setDontShow(false);
      setDir(1);
    };
    window.addEventListener(WALKTHROUGH_EVENT, handler);
    return () => window.removeEventListener(WALKTHROUGH_EVENT, handler);
  }, []);

  const goTo = (next: number) => {
    setDir(next > page ? 1 : -1);
    setPage(next);
  };

  const handleFinish = () => {
    if (dontShow) localStorage.setItem(storageKey, "true");
    setOpen(false);
    setPage(0);
  };

  const handleSkip = () => {
    setOpen(false);
    setPage(0);
  };

  const isFirst = page === 0;
  const isLast = page === PAGES.length - 1;
  const current = PAGES[page];

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        className="bg-transparent border-none shadow-none p-0 max-w-sm w-[92vw] gap-0 flex flex-col items-center"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        hideCloseButton
      >
        <DialogTitle className="sr-only">App Walkthrough</DialogTitle>

        {/* Main card */}
        <div className="w-full rounded-2xl overflow-hidden shadow-2xl"
          style={{ background: "var(--card-default)", border: "1px solid var(--card-border)" }}>

          {/* Image area — fixed height so modal doesn't jump */}
          <div className="relative w-full h-44 overflow-hidden"
            style={{ background: "var(--card-secondary)" }}>
            <AnimatePresence initial={false} custom={dir} mode="wait">
              <motion.div
                key={current.id}
                custom={dir}
                variants={{
                  enter: (d: number) => ({ x: d * 80, opacity: 0 }),
                  center: { x: 0, opacity: 1 },
                  exit: (d: number) => ({ x: d * -80, opacity: 0 }),
                }}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.25, ease: "easeInOut" }}
                className="absolute inset-0 flex items-center justify-center"
              >
                <FadeImg
                  src={current.image}
                  alt=""
                  loading="eager"
                  className="w-full h-full object-cover"
                />
              </motion.div>
            </AnimatePresence>

            {/* Page indicator pill */}
            <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-black/25 backdrop-blur-sm rounded-full px-3 py-1">
              {PAGES.map((_, i) => (
                <button
                  key={i}
                  onClick={() => goTo(i)}
                  className={cn(
                    "rounded-full transition-all duration-300",
                    i === page ? "w-4 h-1.5 bg-white" : "w-1.5 h-1.5 bg-white/50 hover:bg-white/75"
                  )}
                  aria-label={`Go to page ${i + 1}`}
                />
              ))}
            </div>
          </div>

          {/* Text content */}
          <div className="px-6 pt-5 pb-2 min-h-[6.5rem]">
            <AnimatePresence initial={false} custom={dir} mode="wait">
              <motion.div
                key={current.id}
                custom={dir}
                variants={{
                  enter: (d: number) => ({ x: d * 30, opacity: 0 }),
                  center: { x: 0, opacity: 1 },
                  exit: (d: number) => ({ x: d * -30, opacity: 0 }),
                }}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.22, ease: "easeOut" }}
              >
                <h2 className="text-xl font-display font-bold mb-2 leading-tight"
                  style={{ color: "var(--text-main)" }}>
                  {current.title}
                </h2>
                <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
                  {current.body}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Navigation row */}
          <div className="px-6 pb-5 pt-3">
            {!isLast ? (
              <div className="flex items-center justify-between gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn("rounded-xl gap-1 text-sm", isFirst && "invisible")}
                  onClick={() => goTo(page - 1)}
                  disabled={isFirst}
                  data-testid="button-onboarding-back"
                >
                  <ChevronLeft className="w-4 h-4" /> Back
                </Button>

                <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                  {page + 1} of {PAGES.length}
                </span>

                <Button
                  size="sm"
                  className="rounded-xl gap-1 text-sm"
                  onClick={() => goTo(page + 1)}
                  data-testid="button-onboarding-next"
                >
                  Next <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="rounded-xl gap-1 text-sm"
                    onClick={() => goTo(page - 1)}
                    data-testid="button-onboarding-back-last"
                  >
                    <ChevronLeft className="w-4 h-4" /> Back
                  </Button>
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {page + 1} of {PAGES.length}
                  </span>
                  <div className="w-16" />
                </div>

                <Button
                  className="w-full rounded-xl font-semibold text-base"
                  style={{ background: "var(--accent-orange)" }}
                  onClick={handleFinish}
                  data-testid="button-onboarding-start"
                >
                  Start Dancing
                </Button>

                <div className="flex items-center gap-2 justify-center">
                  <Checkbox
                    id="onboarding-dont-show"
                    checked={dontShow}
                    onCheckedChange={(v) => setDontShow(!!v)}
                    data-testid="checkbox-onboarding-dont-show"
                  />
                  <label
                    htmlFor="onboarding-dont-show"
                    className="text-xs cursor-pointer select-none"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Do not show again
                  </label>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Skip link — below the card */}
        <button
          onClick={handleSkip}
          className="mt-4 text-sm text-white/70 hover:text-white transition-colors underline underline-offset-2"
          data-testid="button-onboarding-skip"
        >
          Continue to LineUp
        </button>
      </DialogContent>
    </Dialog>
  );
}
