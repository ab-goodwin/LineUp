import { Link, useLocation } from "wouter";
import { useProfile } from "@/hooks/use-profile";
import logoLong from "@assets/LineUp_tagline_1778180551921.png";
import logoLongDark from "@assets/LineUp_tagline_darkmode.png";
import { Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/context/ThemeContext";
import { FadeImg } from "@/components/FadeImg";
import { useEffect, useState } from "react";

export function Header() {
  const { data: profile } = useProfile();
  const [, setLocation] = useLocation();
  const { theme } = useTheme();
  const [isPwa, setIsPwa] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;

    setIsPwa(standalone);
  }, []);

  return (
    <header
      className="sticky top-0 z-40 w-full bg-background/80 backdrop-blur-md border-b border-border/50"
      style={{
        paddingTop: isPwa ? "80px" : 0,
      }}
    >
      <div className="flex h-20 items-center justify-between px-4 max-w-5xl mx-auto">
        <Link href="/" className="flex items-center cursor-pointer">
          <FadeImg
            src={theme === "dark" ? logoLongDark : logoLong}
            alt="LineUp"
            loading="eager"
            className="h-14 object-contain"
          />
        </Link>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-foreground"
            onClick={() => setLocation("/settings")}
            data-testid="button-header-settings"
          >
            <Settings2 className="w-5 h-5" />
          </Button>

          <Link href="/profile" className="cursor-pointer">
            <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center border-2 border-transparent hover:border-primary transition-all duration-300 overflow-hidden">
              {profile?.avatar ? (
                <FadeImg
                  src={profile.avatar}
                  alt="Profile"
                  loading="eager"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="font-display font-bold text-primary text-lg">
                  {profile?.firstName?.charAt(0) || "D"}
                </span>
              )}
            </div>
          </Link>
        </div>
      </div>
    </header>
  );
}