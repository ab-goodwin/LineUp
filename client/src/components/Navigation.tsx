import { Link, useLocation } from "wouter";
import { ChartNoAxesCombined, Calendar } from "lucide-react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCompactDisc, faHatCowboy } from "@fortawesome/free-solid-svg-icons";
import { cn } from "@/lib/utils";
import { useUnseenAchievements } from "@/hooks/use-achievements";
import buckleIcon from "@/assets/svg/buckle.svg";

function BuckleIcon({ filled, className }: { filled: boolean; className?: string }) {
  if (filled) {
    return (
      <svg viewBox="0 0 594.47913 395.67285" className={className} aria-hidden="true" fill="currentColor">
        <path
          fillRule="evenodd"
          d="M 298.65393,0.64388293 C 195.05811,0.64371293 106.56014,52.523593 70.833567,125.77322 c -1.091601,-0.4522 -2.288096,-0.70345 -3.547094,-0.70345 H 9.8794739 c -5.116474,0 -9.23607406,4.11796 -9.23607406,9.2344 v 127.0667 c 0,5.11644 4.11960106,9.23441 9.23607406,9.23441 H 67.286473 c 1.258987,0 2.455503,-0.25127 3.547094,-0.70345 35.727033,73.24868 124.225493,125.12781 227.820363,125.12764 103.29126,-3.5e-4 191.57408,-51.57678 227.50441,-124.48575 0.34006,0.0375 0.68394,0.0614 1.03437,0.0614 h 57.40699 c 5.11647,0 9.23608,-4.11796 9.23608,-9.2344 v -127.0668 c 0,-5.11645 -4.11961,-9.23442 -9.23608,-9.23442 h -57.40699 c -0.35043,0 -0.69431,0.0222 -1.03437,0.0596 C 490.22842,52.219583 401.94585,0.64375293 298.65393,0.64340293 Z M 182.89205,100.11872 c 0.47356,0 3.98251,6.1689 7.79761,13.70946 l 6.9362,13.71108 -10.77431,5.37298 c -10.9727,5.47201 -21.19019,14.64196 -23.15504,20.782 -1.8477,5.77418 1.89073,6.82485 24.27921,6.82485 h 20.27645 l 1.75774,-5.83369 c 2.69437,-8.94535 6.1655,-14.93094 13.09747,-22.57801 15.89645,-17.5365 41.20006,-26.34911 75.949,-26.45102 44.72298,-0.13121 78.39526,18.14671 87.76929,47.64212 l 2.34977,7.3902 23.82854,-0.42742 c 13.10597,-0.23568 24.26461,-0.86251 24.79804,-1.39354 4.01868,-4.00064 -9.53446,-19.72281 -22.43166,-26.02028 -4.97714,-2.43026 -9.33525,-5.15527 -9.6834,-6.05489 -0.62351,-1.61186 11.60599,-26.67384 13.01597,-26.67384 0.39882,0 5.75782,2.62489 11.91012,5.83369 7.13749,3.72264 14.5012,9.06352 20.34629,14.75707 26.60547,25.91521 24.03834,57.12839 -5.59918,68.07988 -4.69727,1.73574 -12.60606,2.46635 -32.17825,2.96836 -18.35038,0.47059 -25.95047,1.13096 -25.95047,2.25494 0,5.15552 -16.43539,33.42666 -28.47817,48.98748 -5.09721,6.58619 -6.06249,8.90899 -6.8464,16.47331 -1.53668,14.82706 -6.0496,31.62884 -11.39958,42.43866 -12.07557,24.39932 -33.91561,36.15414 -53.99295,29.06186 -9.80708,-3.4644 -19.19498,-11.61272 -26.05856,-22.61785 -7.2602,-11.64091 -11.28857,-23.91604 -14.03538,-42.76137 l -2.19345,-15.04145 -8.74549,-11.72715 c -10.11394,-13.5637 -20.29103,-30.83803 -23.69218,-40.2137 l -2.36473,-6.52046 -18.70496,-0.023 c -33.8751,-0.0434 -47.48035,-5.20372 -55.66256,-21.11125 -4.0301,-7.83516 -3.06872,-22.03019 2.24168,-33.08957 5.4485,-11.34681 19.20942,-24.43839 33.5452,-31.91544 6.15221,-3.2088 11.57448,-5.8337 12.04814,-5.8337 z m 114.37664,36.5269 c -16.19412,0.11528 -20.16933,0.61226 -29.82018,3.73669 -18.54851,6.005 -27.85303,16.38399 -29.34789,32.73529 0,0 -0.0107,7.54583 0.51387,10.16911 2.32617,11.63401 12.47349,24.78731 15.3743,29.2983 3.13685,4.87795 7.87506,10.16929 13.58112,17.25783 6.86852,8.53265 7.74656,11.0351 9.03817,25.78416 1.52161,17.37464 6.57966,32.92474 13.20722,40.60442 5.98253,6.93213 10.7311,7.49544 16.0908,1.90577 8.40596,-8.76645 13.18324,-22.68682 14.77373,-43.05229 1.14228,-14.62646 -0.47607,-10.78181 15.3596,-33.06659 2.67265,-3.76112 5.51983,-5.59758 7.71777,-9.4333 2.31832,-4.04584 13.3058,-16.78553 15.55482,-28.36538 0.51004,-2.62617 1.13582,-11.10203 1.13582,-11.10203 -1.26532,-13.84051 -9.09982,-23.05005 -22.35019,-29.49422 -11.42251,-5.55536 -20.58805,-7.12182 -40.82896,-6.97776 z"
        />
      </svg>
    );
  }

  return (
    <span
      aria-hidden="true"
      className={cn("inline-block bg-current", className)}
      style={{
        WebkitMaskImage: `url(${buckleIcon})`,
        maskImage: `url(${buckleIcon})`,
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
        maskPosition: "center",
        WebkitMaskSize: "contain",
        maskSize: "contain",
      }}
    />
  );
}

export function Navigation() {
  const [location] = useLocation();
  const { data: unseen } = useUnseenAchievements();
  const hasUnseen = (unseen?.count ?? 0) > 0;

  const links = [
    { href: "/", label: "Recap", icon: (props: { className?: string }) => <ChartNoAxesCombined className={cn(props.className, "-translate-y-[1px]")} /> },
    { href: "/calendar", label: "Calendar", icon: (props: { className?: string }) => <Calendar className={cn(props.className, "-translate-y-[1px]")} /> },
    { href: "/library", label: "Library", icon: (props: { className?: string }) => <FontAwesomeIcon icon={faCompactDisc} className={cn(props.className, "scale-[1.0] -translate-y-[2px] origin-bottom")} /> },
    { href: "/buddies", label: "Crew", icon: (props: { className?: string }) => <FontAwesomeIcon icon={faHatCowboy} className={cn(props.className, "scale-[1.2] translate-y-[1px] origin-bottom")} /> },
    { href: "/achievements", label: "Buckles", icon: (props: { className?: string; isActive?: boolean }) => <BuckleIcon filled={!!props.isActive} className={cn(props.className, "scale-[1.42] translate-y-[2px] origin-bottom")} /> },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-background/80 backdrop-blur-md border-t border-border/50 pb-safe z-50">
      <div className="flex justify-around items-center h-[77px] max-w-md mx-auto px-2">
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = location === link.href;
          const showDot = link.href === "/achievements" && hasUnseen && !isActive;

          return (
            <Link key={link.href} href={link.href} className="w-full">
              <div
                className={cn(
                  "flex items-center justify-center w-full h-full p-2 transition-all duration-300 cursor-pointer relative origin-bottom",
                  isActive ? "text-primary scale-110" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <div className="flex flex-col items-center justify-center h-[46px] w-full">
                  <div className="relative h-[26px] w-8 flex items-end justify-center">
                    <Icon className={cn("w-6 h-6", isActive && link.href !== "/achievements" && "fill-current")} isActive={isActive} />
                    {showDot && (
                      <span className="absolute top-0 -right-1 w-2.5 h-2.5 bg-primary rounded-full" />
                    )}
                  </div>
                  <span className="mt-[5px] block w-full text-center text-[11px] font-medium tracking-wide uppercase leading-none">{link.label}</span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}