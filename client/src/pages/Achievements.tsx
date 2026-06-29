import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Lock, Star, Flame, MapPin, Music2, Users, HelpCircle } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useAchievements, useMarkAchievementsSeen } from "@/hooks/use-achievements";
import { ACHIEVEMENT_DEFS, ACHIEVEMENT_GROUPS, type AchievementGroup } from "@shared/achievements";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

// Load all PNGs from achievements folder at build time
const achievementImages = import.meta.glob<{ default: string }>(
  "../assets/achievements/*.png",
  { eager: true }
);

function getImgSrc(filename: string): string {
  const key = `../assets/achievements/${filename}`;
  return achievementImages[key]?.default ?? "";
}

const lockedSrc = getImgSrc("locked.png");

// Custom display order for specific groups
const GROUP_ORDER: Partial<Record<AchievementGroup, string[]>> = {
  Exploration: ["wanderer", "road_trip", "home_turf", "bar_regular", "dance_passport"],
  Variety:     ["variety_pack", "collector", "encore", "crowd_favorite", "human_jukebox"],
};

function getGroupDefs(group: AchievementGroup) {
  const defs = ACHIEVEMENT_DEFS.filter(d => d.group === group);
  const order = GROUP_ORDER[group];
  if (!order) return defs;
  return order.map(id => defs.find(d => d.id === id)!).filter(Boolean);
}

const GROUP_ICONS: Record<AchievementGroup, React.ElementType> = {
  Milestones:  Star,
  Consistency: Flame,
  Exploration: MapPin,
  Variety:     Music2,
  Social:      Users,
  Hidden:      HelpCircle,
};

const GROUP_COLORS: Record<AchievementGroup, string> = {
  Milestones:  "text-yellow-500",
  Consistency: "text-orange-500",
  Exploration: "text-blue-500",
  Variety:     "text-purple-500",
  Social:      "text-pink-500",
  Hidden:      "text-muted-foreground",
};

function AchievementImage({ id, earned, size = "sm" }: { id: string; earned: boolean; size?: "sm" | "lg" }) {
  const [imgError, setImgError] = useState(false);
  const [lockError, setLockError] = useState(false);
  const cls = size === "lg" ? "w-full h-full" : "w-full h-full";

  const src = earned ? getImgSrc(`${id}.png`) : lockedSrc;

  if (src && !imgError) {
    return (
      <img
        src={src}
        alt={earned ? id : "locked"}
        className={cn(cls, "object-cover rounded-full")}
        onError={() => setImgError(true)}
      />
    );
  }
  // Fallback: if locked.png also fails or src is empty, try locking with the earned img, else show icon
  if (!earned && lockedSrc && !lockError) {
    return (
      <img
        src={lockedSrc}
        alt="locked"
        className={cn(cls, "object-cover rounded-full opacity-50")}
        onError={() => setLockError(true)}
      />
    );
  }
  return <Lock className={size === "lg" ? "w-10 h-10 text-muted-foreground/30" : "w-5 h-5 text-muted-foreground/40"} />;
}

export default function Achievements() {
  const { data: statuses = [], isLoading } = useAchievements();
  const markSeen = useMarkAchievementsSeen();
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    markSeen.mutate();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const statusById = Object.fromEntries(statuses.map(s => [s.id, s]));
  const earnedCount = statuses.filter(s => s.earned).length;

  const selectedDef = ACHIEVEMENT_DEFS.find(d => d.id === selected);
  const selectedStatus = selected ? statusById[selected] : null;
  const isHiddenUnearned = selectedDef?.group === "Hidden" && !selectedStatus?.earned;

  return (
    <div className="min-h-screen bg-background pb-28">
      <div className="container px-4 pb-0 pt-8 mx-auto max-w-xl">
        <h1 className="text-3xl font-display font-bold text-foreground">Your Badges</h1>
        {!isLoading && (
          <p className="text-muted-foreground mt-1">{earnedCount} of {ACHIEVEMENT_DEFS.length} earned</p>
        )}
      </div>

      <div className="px-4 pt-6 space-y-8 max-w-xl mx-auto">
        {isLoading ? (
          <div className="grid grid-cols-4 gap-3">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-1.5">
                <Skeleton className="w-16 h-16 rounded-full" />
                <Skeleton className="h-3 w-12 rounded" />
              </div>
            ))}
          </div>
        ) : (
          ACHIEVEMENT_GROUPS.map(group => {
            const GroupIcon = GROUP_ICONS[group];
            const groupDefs = getGroupDefs(group);

            return (
              <section key={group}>
                <div className="flex items-center gap-2 mb-3">
                  <GroupIcon className={cn("w-4 h-4", GROUP_COLORS[group])} />
                  <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">{group}</h2>
                </div>
                <div className="grid grid-cols-4 gap-3">
                  {groupDefs.map(def => {
                    const status = statusById[def.id];
                    const earned = status?.earned ?? false;
                    const isHidden = def.group === "Hidden";

                    return (
                      <motion.button
                        key={def.id}
                        data-testid={`badge-${def.id}`}
                        whileTap={{ scale: 0.92 }}
                        onClick={() => setSelected(def.id)}
                        className="flex flex-col items-center gap-1.5 focus:outline-none"
                      >
                        <div className={cn(
                          "w-16 h-16 rounded-full flex items-center justify-center border-2 overflow-hidden transition-all",
                          earned
                            ? "border-primary/60 shadow-md shadow-primary/20"
                            : "border-border/50 bg-secondary/40"
                        )}>
                          <AchievementImage id={def.id} earned={earned} size="sm" />
                        </div>
                        <span className={cn(
                          "text-[10px] text-center leading-tight line-clamp-2 w-full px-0.5",
                          earned ? "text-foreground font-medium" : "text-muted-foreground/60"
                        )}>
                          {isHidden && !earned ? "???" : def.name}
                        </span>
                      </motion.button>
                    );
                  })}
                </div>
              </section>
            );
          })
        )}
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!selected} onOpenChange={open => !open && setSelected(null)}>
        <DialogContent className="rounded-2xl max-w-xs mx-auto border-border/60">
          {selectedDef && (
            <div className="flex flex-col items-center gap-3 pt-2 pb-1">
              {/* Badge visual */}
              <div className={cn(
                "w-24 h-24 rounded-full flex items-center justify-center border-2 overflow-hidden",
                selectedStatus?.earned
                  ? "border-primary/60 shadow-lg shadow-primary/20"
                  : "border-border/50 bg-secondary/40"
              )}>
                <AchievementImage id={selectedDef.id} earned={selectedStatus?.earned ?? false} size="lg" />
              </div>

              {/* Title */}
              <div className="text-center">
                <h3 className="font-display text-lg leading-tight">
                  {isHiddenUnearned ? "???" : selectedDef.name}
                </h3>
                <span className={cn("text-xs font-medium", GROUP_COLORS[selectedDef.group])}>
                  {selectedDef.group}
                </span>
              </div>

              {/* Description */}
              <p className="text-sm text-muted-foreground text-center leading-relaxed">
                {isHiddenUnearned
                  ? "Keep dancing to discover this one."
                  : selectedDef.description}
              </p>

              {/* Progress */}
              {!isHiddenUnearned && selectedStatus && !selectedStatus.earned && (
                <div className="w-full space-y-1.5">
                  <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${Math.min((selectedStatus.progress / selectedStatus.target) * 100, 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-center text-muted-foreground">
                    {selectedStatus.progress} / {selectedStatus.target}
                  </p>
                </div>
              )}

              {/* Earned badge */}
              {selectedStatus?.earned && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/30">
                  <Star className="w-3.5 h-3.5 text-primary fill-primary" />
                  <span className="text-xs font-semibold text-primary">
                    {selectedStatus.earnedAt
                      ? `Earned ${format(new Date(selectedStatus.earnedAt), "MMM d, yyyy")}`
                      : "Earned!"}
                  </span>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
