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
      transition: {
        staggerChildren: 0.1
      }
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
      ) : (
        <motion.div 
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          <motion.div variants={item}>
            <StatCard 
              label="Total Dances" 
              value={stats?.totalDances ?? 0}
              icon={Music2}
              className="bg-orange-50/50 border-orange-100 hover:border-orange-200"
            />
          </motion.div>
          
          <motion.div variants={item}>
            <StatCard 
              label="Longest Streak" 
              value={`${stats?.longestStreak ?? 0} Days`}
              icon={Flame}
              className="bg-red-50/50 border-red-100 hover:border-red-200"
            />
          </motion.div>

          <motion.div variants={item}>
            <StatCard 
              label="Days Dancing" 
              value={stats?.totalDaysDancing ?? 0}
              icon={CalendarDays}
              className="bg-blue-50/50 border-blue-100 hover:border-blue-200"
            />
          </motion.div>

          <motion.div variants={item}>
            <StatCard 
              label="Locations Visited" 
              value={stats?.uniqueLocations ?? 0}
              icon={MapPin}
              className="bg-green-50/50 border-green-100 hover:border-green-200"
            />
          </motion.div>

          <motion.div variants={item}>
            <StatCard 
              label="Top Location" 
              value={stats?.mostFrequentLocation || "—"}
              description={stats?.mostFrequentLocationCount ? `${stats.mostFrequentLocationCount} visits` : undefined}
              icon={Trophy}
              className="bg-yellow-50/50 border-yellow-100 hover:border-yellow-200"
            />
          </motion.div>

          <motion.div variants={item}>
            <StatCard 
              label="Favorite Dance" 
              value={stats?.mostFrequentDance || "—"}
              description={stats?.mostFrequentDanceCount ? `${stats.mostFrequentDanceCount} times` : undefined}
              icon={Activity}
              className="bg-purple-50/50 border-purple-100 hover:border-purple-200"
            />
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
