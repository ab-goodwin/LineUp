import { Link, useLocation } from "wouter";
import { Home, Calendar, Music, Users } from "lucide-react";
import { cn } from "@/lib/utils";

export function Navigation() {
  const [location] = useLocation();

  const links = [
    { href: "/", label: "Home", icon: Home },
    { href: "/calendar", label: "Calendar", icon: Calendar },
    { href: "/library", label: "Library", icon: Music },
    { href: "/buddies", label: "Buddies", icon: Users },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-background/80 backdrop-blur-md border-t border-border/50 pb-safe z-50">
      <div className="flex justify-around items-center h-16 max-w-md mx-auto px-4">
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = location === link.href;

          return (
            <Link key={link.href} href={link.href} className="w-full">
              <div
                className={cn(
                  "flex flex-col items-center justify-center gap-1 w-full h-full p-2 transition-all duration-300 cursor-pointer",
                  isActive ? "text-primary scale-110" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className={cn("w-6 h-6", isActive && "fill-current")} />
                <span className="text-[10px] font-medium tracking-wide uppercase">{link.label}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
