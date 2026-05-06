import { useState } from "react";
import { useProfile } from "@/hooks/use-profile";
import { useStats } from "@/hooks/use-stats";
import { StatCard } from "@/components/StatCard";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Music2, CalendarDays, MapPin, Flame, Trophy, Activity,
  TrendingUp, Clock, BarChart2, Star, Zap, Settings2, Check
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const ALL_STAT_KEYS = [
  { key: "totalDances",       label: "Total Dances" },
  { key: "longestStreak",     label: "Longest Streak" },
  { key: "totalDaysDancing",  label: "Days Dancing" },
  { key: "uniqueLocations",   label: "Locations" },
  { key: "dancesThisMonth",   label: "Dances This Month" },
  { key: "avgDancesPerSession", label: "Avg Per Session" },
  { key: "mostDancedDay",     label: "Most Danced Day" },
  { key: "mostRecentDance",   label: "Most Recently Added" },
  { key: "topLocation",       label: "Top Location" },
  { key: "top3Dances",        label: "Top 3 Dances" },
  { key: "favoriteDance",     label: "Favorite Dance" },
];

function useHomepageStats() {
  return useQuery<{ stats: string[] | null }>({
    queryKey: ["/api/profile/homepage-stats"],
    queryFn: async () => {
      const res = await fetch("/api/profile/homepage-stats", { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });
}

function useSetHomepageStats() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (stats: string[]) => {
      const res = await fetch("/api/profile/homepage-stats", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stats }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/profile/homepage-stats"] }),
  });
}

function EditHomepageDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data: prefData } = useHomepageStats();
  const setStats = useSetHomepageStats();
  const { toast } = useToast();

  const currentEnabled = prefData?.stats ?? ALL_STAT_KEYS.map(s => s.key);
  const [enabled, setEnabled] = useState<string[]>(currentEnabled);

  // Sync from server when dialog opens
  const toggle = (key: string) => {
    setEnabled(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  };

  const handleSave = async () => {
    await setStats.mutateAsync(enabled);
    toast({ title: "Homepage updated!" });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="rounded-2xl bg-card max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Customize Homepage</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground -mt-2">Toggle which stats appear on your home screen.</p>
        <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
          {ALL_STAT_KEYS.map(({ key, label }) => (
            <div key={key} className="flex items-center justify-between rounded-xl px-3 py-2.5 bg-secondary/30">
              <span className="text-sm font-medium">{label}</span>
              <Switch checked={enabled.includes(key)} onCheckedChange={() => toggle(key)} />
            </div>
          ))}
        </div>
        <div className="flex gap-2 pt-2">
          <Button variant="outline" className="flex-1 rounded-xl" onClick={onClose}>Cancel</Button>
          <Button className="flex-1 rounded-xl gap-2" onClick={handleSave} disabled={setStats.isPending}>
            <Check className="w-4 h-4" /> Save
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function Home() {
  const { data: profile, isLoading: profileLoading } = useProfile();
  const { data: stats, isLoading: statsLoading } = useStats();
  const { data: prefData } = useHomepageStats();
  const [editOpen, setEditOpen] = useState(false);

  const enabledStats = prefData?.stats ?? ALL_STAT_KEYS.map(s => s.key);
  const isEnabled = (key: string) => enabledStats.includes(key);

  const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } };
  const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

  const mostDancedDayLabel = stats?.mostDancedDay
    ? `${format(new Date(stats.mostDancedDay.date + "T12:00:00"), "MMM d, yyyy")} · ${stats.mostDancedDay.count} dance${stats.mostDancedDay.count !== 1 ? "s" : ""}`
    : "—";

  return (
    <div className="container px-4 pb-28 pt-8 mx-auto max-w-5xl">
      <div className="mb-8 space-y-1">
        {profileLoading ? (
          <Skeleton className="h-10 w-48 rounded-lg" />
        ) : (
          <motion.h1 initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
            className="text-3xl md:text-4xl font-display font-bold text-foreground">
            Hi, {profile?.firstName || "Dancer"}
          </motion.h1>
        )}
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
          className="text-muted-foreground text-lg">
          Ready to get dancing?
        </motion.p>
      </div>

      {statsLoading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}
          </div>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}
          </div>
        </div>
      ) : (
        <motion.div variants={container} initial="hidden" animate="show" className="space-y-4">
          {/* Core 2x2 grid */}
          <div className="grid grid-cols-2 gap-4">
            {isEnabled("totalDances") && (
              <motion.div variants={item}>
                <StatCard label="Total Dances" value={stats?.totalDances ?? 0} icon={Music2} className="bg-orange-100/70 border-orange-200 hover:border-orange-300" />
              </motion.div>
            )}
            {isEnabled("longestStreak") && (
              <motion.div variants={item}>
                <StatCard label="Longest Streak" value={`${stats?.longestStreak ?? 0} Days`} icon={Flame} className="bg-red-100/70 border-red-200 hover:border-red-300" />
              </motion.div>
            )}
            {isEnabled("totalDaysDancing") && (
              <motion.div variants={item}>
                <StatCard label="Days Dancing" value={stats?.totalDaysDancing ?? 0} icon={CalendarDays} className="bg-blue-100/70 border-blue-200 hover:border-blue-300" />
              </motion.div>
            )}
            {isEnabled("uniqueLocations") && (
              <motion.div variants={item}>
                <StatCard label="Locations" value={stats?.uniqueLocations ?? 0} icon={MapPin} className="bg-green-100/70 border-green-200 hover:border-green-300" />
              </motion.div>
            )}
          </div>

          {/* New pair row */}
          {(isEnabled("dancesThisMonth") || isEnabled("avgDancesPerSession")) && (
            <div className="grid grid-cols-2 gap-4">
              {isEnabled("dancesThisMonth") && (
                <motion.div variants={item}>
                  <StatCard label="Dances This Month" value={stats?.dancesThisMonth ?? 0} icon={TrendingUp} className="bg-teal-100/70 border-teal-200 hover:border-teal-300" />
                </motion.div>
              )}
              {isEnabled("avgDancesPerSession") && (
                <motion.div variants={item}>
                  <StatCard label="Avg Per Session" value={stats?.avgDancesPerSession ?? 0} icon={Zap} className="bg-indigo-100/70 border-indigo-200 hover:border-indigo-300" />
                </motion.div>
              )}
            </div>
          )}

          {/* Stacked full-width stats */}
          <div className="space-y-4">
            {isEnabled("mostDancedDay") && (
              <motion.div variants={item}>
                <StatCard label="Most Danced Day" value={mostDancedDayLabel} icon={BarChart2} className="bg-rose-100/70 border-rose-200 hover:border-rose-300" />
              </motion.div>
            )}
            {isEnabled("mostRecentDance") && (
              <motion.div variants={item}>
                <StatCard label="Most Recently Added" value={stats?.mostRecentDance || "—"} icon={Clock} className="bg-sky-100/70 border-sky-200 hover:border-sky-300" />
              </motion.div>
            )}
            {isEnabled("topLocation") && (
              <motion.div variants={item}>
                <StatCard label="Top Location" value={stats?.mostFrequentLocation || "—"}
                  description={stats?.mostFrequentLocationCount ? `${stats.mostFrequentLocationCount} visits` : undefined}
                  icon={Trophy} className="bg-yellow-100/70 border-yellow-200 hover:border-yellow-300" />
              </motion.div>
            )}
            {isEnabled("top3Dances") && (
              <motion.div variants={item}>
                <div className="bg-purple-100/70 border border-purple-200 hover:border-purple-300 rounded-2xl p-5 transition-all">
                  <div className="flex items-center gap-2 mb-3">
                    <Activity className="w-5 h-5 text-purple-600" />
                    <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Top 3 Dances</span>
                  </div>
                  {stats?.top3Dances && stats.top3Dances.length > 0 ? (
                    <div className="space-y-2">
                      {stats.top3Dances.map((dance, idx) => (
                        <div key={dance.danceName} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {idx === 0 && <Trophy className="w-4 h-4 text-yellow-500" />}
                            {idx === 1 && <Trophy className="w-4 h-4 text-slate-400" />}
                            {idx === 2 && <Trophy className="w-4 h-4 text-amber-600" />}
                            <span className="font-semibold text-foreground font-display">{dance.danceName}</span>
                          </div>
                          <span className="text-sm text-muted-foreground">{dance.count}x</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-foreground font-bold font-display text-2xl">—</p>
                  )}
                </div>
              </motion.div>
            )}
            {isEnabled("favoriteDance") && (
              <motion.div variants={item}>
                <StatCard label="Favorite Dance" value={stats?.mostFrequentDance || "—"}
                  description={stats?.mostFrequentDanceCount ? `${stats.mostFrequentDanceCount} times` : undefined}
                  icon={Star} className="bg-amber-100/70 border-amber-200 hover:border-amber-300" />
              </motion.div>
            )}
          </div>
        </motion.div>
      )}

      {/* Edit Homepage button */}
      <div className="mt-8 flex justify-center">
        <Button variant="outline" className="rounded-xl gap-2 text-muted-foreground border-2" onClick={() => setEditOpen(true)} data-testid="button-edit-homepage">
          <Settings2 className="w-4 h-4" /> Edit Homepage
        </Button>
      </div>

      <EditHomepageDialog open={editOpen} onClose={() => setEditOpen(false)} />
    </div>
  );
}
