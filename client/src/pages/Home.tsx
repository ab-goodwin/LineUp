import { useProfile } from "@/hooks/use-profile";
import { useStats } from "@/hooks/use-stats";
import { StatCard } from "@/components/StatCard";
import {
  Music2,
  CalendarDays,
  MapPin,
  Flame,
  Trophy,
  Activity,
  TrendingUp,
  Clock,
  BarChart2,
  Star,
  Zap,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { format } from "date-fns";

export default function Home() {
  const { data: profile, isLoading: profileLoading } = useProfile();
  const { data: stats, isLoading: statsLoading } = useStats();

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.08 }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  const mostDancedDayLabel = stats?.mostDancedDay
    ? `${format(new Date(stats.mostDancedDay.date + "T12:00:00"), "MMM d, yyyy")} · ${stats.mostDancedDay.count} dance${stats.mostDancedDay.count !== 1 ? "s" : ""}`
    : "—";

  return (
    <div className="container px-4 pb-24 pt-8 mx-auto max-w-5xl">
      <div className="mb-8 space-y-1">
        {profileLoading ? (
          <Skeleton className="h-10 w-48 rounded-lg" />
        ) : (
          <motion.h1
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-3xl md:text-4xl font-display font-bold text-foreground"
          >
            Hi, {profile?.firstName || "Dancer"}
          </motion.h1>
        )}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-muted-foreground text-lg"
        >
          Ready to get dancing?
        </motion.p>
      </div>

      {statsLoading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-2xl" />
            ))}
          </div>
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-2xl" />
            ))}
          </div>
        </div>
      ) : (
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="space-y-4"
        >
          {/* 2x2 Core Stats Grid */}
          <div className="grid grid-cols-2 gap-4">
            <motion.div variants={item}>
              <StatCard
                label="Total Dances"
                value={stats?.totalDances ?? 0}
                icon={Music2}
                className="bg-orange-100/70 border-orange-200 hover:border-orange-300"
              />
            </motion.div>

            <motion.div variants={item}>
              <StatCard
                label="Longest Streak"
                value={`${stats?.longestStreak ?? 0} Days`}
                icon={Flame}
                className="bg-red-100/70 border-red-200 hover:border-red-300"
              />
            </motion.div>

            <motion.div variants={item}>
              <StatCard
                label="Days Dancing"
                value={stats?.totalDaysDancing ?? 0}
                icon={CalendarDays}
                className="bg-blue-100/70 border-blue-200 hover:border-blue-300"
              />
            </motion.div>

            <motion.div variants={item}>
              <StatCard
                label="Locations"
                value={stats?.uniqueLocations ?? 0}
                icon={MapPin}
                className="bg-green-100/70 border-green-200 hover:border-green-300"
              />
            </motion.div>
          </div>

          {/* New stats row */}
          <div className="grid grid-cols-2 gap-4">
            <motion.div variants={item}>
              <StatCard
                label="Dances This Month"
                value={stats?.dancesThisMonth ?? 0}
                icon={TrendingUp}
                className="bg-teal-100/70 border-teal-200 hover:border-teal-300"
              />
            </motion.div>

            <motion.div variants={item}>
              <StatCard
                label="Avg Per Session"
                value={stats?.avgDancesPerSession ?? 0}
                icon={Zap}
                className="bg-indigo-100/70 border-indigo-200 hover:border-indigo-300"
              />
            </motion.div>
          </div>

          {/* Stacked full-width stats */}
          <div className="space-y-4">
            <motion.div variants={item}>
              <StatCard
                label="Most Danced Day"
                value={mostDancedDayLabel}
                icon={BarChart2}
                className="bg-rose-100/70 border-rose-200 hover:border-rose-300"
              />
            </motion.div>

            <motion.div variants={item}>
              <StatCard
                label="Most Recently Added"
                value={stats?.mostRecentDance || "—"}
                icon={Clock}
                className="bg-sky-100/70 border-sky-200 hover:border-sky-300"
              />
            </motion.div>

            <motion.div variants={item}>
              <StatCard
                label="Top Location"
                value={stats?.mostFrequentLocation || "—"}
                description={stats?.mostFrequentLocationCount ? `${stats.mostFrequentLocationCount} visits` : undefined}
                icon={Trophy}
                className="bg-yellow-100/70 border-yellow-200 hover:border-yellow-300"
              />
            </motion.div>

            {/* Top 3 Dances */}
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

            {/* Favorite dance (single) kept as reference */}
            <motion.div variants={item}>
              <StatCard
                label="Favorite Dance"
                value={stats?.mostFrequentDance || "—"}
                description={stats?.mostFrequentDanceCount ? `${stats.mostFrequentDanceCount} times` : undefined}
                icon={Star}
                className="bg-amber-100/70 border-amber-200 hover:border-amber-300"
              />
            </motion.div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
