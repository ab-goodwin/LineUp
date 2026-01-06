import { Link } from "wouter";
import { User, Music } from "lucide-react";
import { useProfile } from "@/hooks/use-profile";

export function Header() {
  const { data: profile } = useProfile();

  return (
    <header className="sticky top-0 z-40 w-full bg-background/80 backdrop-blur-md border-b border-border/50">
      <div className="flex h-16 items-center justify-between px-4 max-w-7xl mx-auto">
        <Link href="/" className="flex items-center gap-2 cursor-pointer">
          <div className="p-2 bg-primary/10 rounded-full">
            <Music className="w-5 h-5 text-primary" />
          </div>
          <span className="font-display text-xl font-bold text-foreground">BootMetrics</span>
        </Link>

        <Link href="/profile" className="cursor-pointer">
          <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center border-2 border-transparent hover:border-primary transition-all duration-300">
            <span className="font-display font-bold text-primary text-lg">
              {profile?.firstName?.charAt(0) || "D"}
            </span>
          </div>
        </Link>
      </div>
    </header>
  );
}
