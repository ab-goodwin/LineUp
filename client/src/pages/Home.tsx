import { useProfile } from "@/hooks/use-profile";
import { useStats } from "@/hooks/use-stats";
import { StatCard } from "@/components/StatCard";
import { 
  Music2, 
  CalendarDays, 
  MapPin, 
  Flame, 
  Trophy,
  Activity
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";

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
            {[...Array(2)].map((_, i) => (
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

          {/* Stacked Favorites */}
          <div className="space-y-4">
            <motion.div variants={item}>
              <StatCard 
                label="Top Location" 
                value={stats?.mostFrequentLocation || "—"}
                description={stats?.mostFrequentLocationCount ? `${stats.mostFrequentLocationCount} visits` : undefined}
                icon={Trophy}
                className="bg-yellow-100/70 border-yellow-200 hover:border-yellow-300"
              />
            </motion.div>

            <motion.div variants={item}>
              <StatCard 
                label="Favorite Dance" 
                value={stats?.mostFrequentDance || "—"}
                description={stats?.mostFrequentDanceCount ? `${stats.mostFrequentDanceCount} times` : undefined}
                icon={Activity}
                className="bg-purple-100/70 border-purple-200 hover:border-purple-300"
              />
            </motion.div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
