import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { FadeImg } from "@/components/FadeImg";
import {
  useProfile,
  useUpdateOnboardingPreference,
} from "@/hooks/use-profile";
import { useToast } from "@/hooks/use-toast";

import recapImg from "@/assets/onboarding/onboarding-recap.png";
import calendarImg from "@/assets/onboarding/onboarding-calendar.png";
import libraryImg from "@/assets/onboarding/onboarding-library.png";
import crewImg from "@/assets/onboarding/onboarding-crew.png";
import bucklesImg from "@/assets/onboarding/onboarding-buckles.png";

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
  const { data: profile, isLoading: profileLoading } = useProfile();
  const updatePreference = useUpdateOnboardingPreference();
  const { toast } = useToast();

  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [dontShow, setDontShow] = useState(false);
  const [dir, setDir] = useState<1 | -1>(1);
  const [manualOpen, setManualOpen] = useState(false);

  // Prevent automatic onboarding from reopening repeatedly during one mounted
  // app instance. The database remains the source of truth across launches.
  const autoOpenHandledForUser = useRef<number | null>(null);

  useEffect(() => {
    if (profileLoading || !profile || profile.id !== userId) return;
    if (autoOpenHandledForUser.current === userId) return;

    autoOpenHandledForUser.current = userId;
    setDontShow(profile.onboardingDontShow ?? false);

    if (!profile.onboardingDontShow) {
      setManualOpen(false);
      setPage(0);
      setDir(1);
      setOpen(true);
    }
  }, [profileLoading, profile, profile?.onboardingDontShow, userId]);

  useEffect(() => {
    const handler = () => {
      // Settings walkthrough always opens, regardless of the saved preference.
      setManualOpen(true);
      setOpen(true);
      setPage(0);
      setDontShow(profile?.onboardingDontShow ?? false);
      setDir(1);
    };

    window.addEventListener(WALKTHROUGH_EVENT, handler);
    return () => window.removeEventListener(WALKTHROUGH_EVENT, handler);
  }, [profile?.onboardingDontShow]);

  const goTo = (next: number) => {
    setDir(next > page ? 1 : -1);
    setPage(next);
  };

  const closeCarousel = () => {
    setOpen(false);
    setPage(0);
    setDir(1);
    setManualOpen(false);
  };

  const handleFinish = async () => {
    const currentSavedValue = profile?.onboardingDontShow ?? false;

    try {
      // Option A: checkbox stays visible during a manual walkthrough.
      // Save only when its value changed.
      if (dontShow !== currentSavedValue) {
        await updatePreference.mutateAsync(dontShow);
      }

      closeCarousel();
    } catch (error) {
      console.error("Failed to save onboarding preference:", error);
      toast({
        title: "Could not save walkthrough preference",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleSkip = () => {
    // Skipping closes the carousel without changing the database preference.
    closeCarousel();
  };

  const isFirst = page === 0;
  const isLast = page === PAGES.length - 1;
  const current = PAGES[page];

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        className="bg-transparent border-none shadow-none p-0 max-w-sm w-[92vw] gap-0 flex flex-col items-center"
        onInteractOutside={(event) => event.preventDefault()}
        onEscapeKeyDown={(event) => event.preventDefault()}
        hideCloseButton
      >
        <DialogTitle className="sr-only">App Walkthrough</DialogTitle>

        <div
          className="w-full rounded-2xl overflow-hidden shadow-2xl"
          style={{
            background: "var(--card-default)",
            border: "1px solid var(--card-border)",
          }}
        >
          <div
            className="relative w-full h-44 overflow-hidden"
            style={{ background: "var(--card-secondary)" }}
          >
            <AnimatePresence initial={false} custom={dir} mode="wait">
              <motion.div
                key={current.id}
                custom={dir}
                variants={{
                  enter: (direction: number) => ({
                    x: direction * 80,
                    opacity: 0,
                  }),
                  center: { x: 0, opacity: 1 },
                  exit: (direction: number) => ({
                    x: direction * -80,
                    opacity: 0,
                  }),
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

            <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-black/25 backdrop-blur-sm rounded-full px-3 py-1">
              {PAGES.map((_, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => goTo(index)}
                  className={cn(
                    "rounded-full transition-all duration-300",
                    index === page
                      ? "w-4 h-1.5 bg-white"
                      : "w-1.5 h-1.5 bg-white/50 hover:bg-white/75",
                  )}
                  aria-label={`Go to page ${index + 1}`}
                />
              ))}
            </div>
          </div>

          <div className="px-6 pt-5 pb-2 min-h-[6.5rem]">
            <AnimatePresence initial={false} custom={dir} mode="wait">
              <motion.div
                key={current.id}
                custom={dir}
                variants={{
                  enter: (direction: number) => ({
                    x: direction * 30,
                    opacity: 0,
                  }),
                  center: { x: 0, opacity: 1 },
                  exit: (direction: number) => ({
                    x: direction * -30,
                    opacity: 0,
                  }),
                }}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.22, ease: "easeOut" }}
              >
                <h2
                  className="text-xl font-display font-bold mb-2 leading-tight"
                  style={{ color: "var(--text-main)" }}
                >
                  {current.title}
                </h2>
                <p
                  className="text-sm leading-relaxed"
                  style={{ color: "var(--text-muted)" }}
                >
                  {current.body}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="px-6 pb-5 pt-3">
            {!isLast ? (
              <div className="flex items-center justify-between gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "rounded-xl gap-1 text-sm",
                    isFirst && "invisible",
                  )}
                  onClick={() => goTo(page - 1)}
                  disabled={isFirst}
                  data-testid="button-onboarding-back"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Back
                </Button>

                <span
                  className="text-xs"
                  style={{ color: "var(--text-muted)" }}
                >
                  {page + 1} of {PAGES.length}
                </span>

                <Button
                  size="sm"
                  className="rounded-xl gap-1 text-sm"
                  onClick={() => goTo(page + 1)}
                  data-testid="button-onboarding-next"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
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
                    <ChevronLeft className="w-4 h-4" />
                    Back
                  </Button>

                  <span
                    className="text-xs"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {page + 1} of {PAGES.length}
                  </span>

                  <div className="w-16" />
                </div>

                <Button
                  className="w-full rounded-xl font-semibold text-base"
                  style={{ background: "var(--accent-orange)" }}
                  onClick={handleFinish}
                  disabled={updatePreference.isPending}
                  data-testid="button-onboarding-start"
                >
                  {updatePreference.isPending
                    ? "Saving..."
                    : manualOpen
                      ? "Close Walkthrough"
                      : "Start Dancing"}
                </Button>

                <div className="flex items-center gap-2 justify-center">
                  <Checkbox
                    id="onboarding-dont-show"
                    checked={dontShow}
                    onCheckedChange={(value) => setDontShow(value === true)}
                    disabled={updatePreference.isPending}
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

        <button
          type="button"
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
