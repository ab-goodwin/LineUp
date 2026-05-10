import { Link, useLocation } from "wouter";
import { Home, Calendar, Music, Users, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUnseenAchievements } from "@/hooks/use-achievements";

export function Navigation() {
  const [location] = useLocation();
  const { data: unseen } = useUnseenAchievements();
  const hasUnseen = (unseen?.count ?? 0) > 0;

  const links = [
    { href: "/", label: "Home", icon: Home },
    { href: "/calendar", label: "Calendar", icon: Calendar },
    { href: "/library", label: "Library", icon: Music },
    { href: "/buddies", label: "Buddies", icon: Users },
    { href: "/achievements", label: "Badges", icon: Trophy },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-background/80 backdrop-blur-md border-t border-border/50 pb-safe z-50">
      <div className="flex justify-around items-center h-16 max-w-md mx-auto px-2">
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = location === link.href;
          const showDot = link.href === "/achievements" && hasUnseen && !isActive;

          return (
            <Link key={link.href} href={link.href} className="w-full">
              <div
                className={cn(
                  "flex flex-col items-center justify-center gap-1 w-full h-full p-2 transition-all duration-300 cursor-pointer relative",
                  isActive ? "text-primary scale-110" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <div className="relative">
                  <Icon className={cn("w-5 h-5", isActive && "fill-current")} />
                  {showDot && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full" />
                  )}
                </div>
                <span className="text-[9px] font-medium tracking-wide uppercase">{link.label}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
