import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Trophy, Lock, Star, Flame, MapPin, Music2, Users, HelpCircle } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useAchievements, useMarkAchievementsSeen } from "@/hooks/use-achievements";
import { ACHIEVEMENT_DEFS, ACHIEVEMENT_GROUPS, type AchievementDef, type AchievementGroup } from "@shared/achievements";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

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

function AchievementImage({ id, size = "sm" }: { id: string; size?: "sm" | "lg" }) {
  const [errored, setErrored] = useState(false);
  const cls = size === "lg" ? "w-16 h-16" : "w-9 h-9";
  const iconCls = size === "lg" ? "w-8 h-8" : "w-5 h-5";
  if (!errored) {
    return (
      <img
        src={`/achievement-images/${id}.png`}
        alt={id}
        className={cn(cls, "object-contain rounded-full")}
        onError={() => setErrored(true)}
      />
    );
  }
  return <Trophy className={cn(iconCls, "text-primary")} />;
}

export default function Achievements() {
  const [, setLocation] = useLocation();
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
        {ACHIEVEMENT_GROUPS.map(group => {
          const GroupIcon = GROUP_ICONS[group];
          const groupDefs = ACHIEVEMENT_DEFS.filter(d => d.group === group);

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
                        "w-16 h-16 rounded-full flex items-center justify-center border-2 transition-all",
                        earned
                          ? "border-primary/60 bg-primary/10 shadow-md shadow-primary/20"
                          : "border-border/50 bg-secondary/40"
                      )}>
                        {earned ? (
                          <AchievementImage id={def.id} size="sm" />
                        ) : (
                          <Lock className="w-5 h-5 text-muted-foreground/40" />
                        )}
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
        })}

        {isLoading && (
          <div className="grid grid-cols-4 gap-3">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-1.5">
                <Skeleton className="w-16 h-16 rounded-full" />
                <Skeleton className="h-3 w-12 rounded" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!selected} onOpenChange={open => !open && setSelected(null)}>
        <DialogContent className="rounded-2xl max-w-xs mx-auto border-border/60">
          {selectedDef && (
            <div className="flex flex-col items-center gap-3 pt-2 pb-1">
              {/* Badge visual */}
              <div className={cn(
                "w-24 h-24 rounded-full flex items-center justify-center border-2",
                selectedStatus?.earned
                  ? "border-primary/60 bg-primary/10 shadow-lg shadow-primary/20"
                  : "border-border/50 bg-secondary/40"
              )}>
                {selectedStatus?.earned ? (
                  <AchievementImage id={selectedDef.id} size="lg" />
                ) : (
                  <Lock className="w-10 h-10 text-muted-foreground/30" />
                )}
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
