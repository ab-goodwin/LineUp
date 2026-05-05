import { Link } from "wouter";
import { useProfile } from "@/hooks/use-profile";
import logoLong from "@assets/LineUp_Long_1777958974669.png";

export function Header() {
  const { data: profile } = useProfile();

  return (
    <header className="sticky top-0 z-40 w-full bg-background/80 backdrop-blur-md border-b border-border/50">
      <div className="flex h-20 items-center justify-between px-4 max-w-5xl mx-auto">
        <Link href="/" className="flex items-center cursor-pointer">
          <img src={logoLong} alt="LineUp" className="h-14 object-contain" />
        </Link>

        <Link href="/profile" className="cursor-pointer">
          <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center border-2 border-transparent hover:border-primary transition-all duration-300 overflow-hidden">
            {profile?.avatar ? (
              <img src={profile.avatar} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <span className="font-display font-bold text-primary text-lg">
                {profile?.firstName?.charAt(0) || "D"}
              </span>
            )}
          </div>
        </Link>
      </div>
    </header>
  );
}
