import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useProfile } from "@/hooks/use-profile";
import { useStats } from "@/hooks/use-stats";
import { StatCard } from "@/components/StatCard";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { STYLE_INFO, type StyleOption } from "@shared/schema";
import { useUnseenAchievements, useMarkAchievementsSeen } from "@/hooks/use-achievements";
import {
  Music2, CalendarDays, MapPin, Flame, Trophy, Sparkles, Footprints,
  TrendingUp, Clock, BarChart2, Star, Heart, Settings2, Check, PieChart as PieIcon, GripVertical, Zap, ChevronRight
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  DndContext, closestCenter, PointerSensor, TouchSensor, useSensor, useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, useSortable, verticalListSortingStrategy, arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

type CardType = "hero" | "quickStat" | "feature" | "chart";

const ALL_STAT_KEYS: { key: string; label: string; description: string; type: CardType }[] = [
  { key: "monthlyRecap",           label: "This Month's LineUp",   description: "Monthly dances, days dancing, locations, and average/session.", type: "hero" },
  { key: "longestStreak",          label: "Longest Streak",        description: "Your longest dancing streak.", type: "quickStat" },
  { key: "totalDances",            label: "Total Dances",          description: "All-time dance count.", type: "quickStat" },
  { key: "mostRecentDance",        label: "Recently Added",        description: "The newest dance in your library.", type: "feature" },
  { key: "mostDancedDay",          label: "Best Night",            description: "Your most active dance day.", type: "feature" },
  { key: "topLocation",            label: "Top Location",          description: "Where you dance the most.", type: "feature" },
  { key: "danceMix",               label: "Dance Mix",             description: "Breakdown of line vs swing dances.", type: "chart" },
  { key: "currentFavorite",        label: "Current Favorite",      description: "The song you're loving right now.", type: "feature" },
  { key: "favoriteDanceStyle",     label: "Favorite Style",        description: "The dance style you do most.", type: "feature" },
  { key: "totalDaysDancing",       label: "Days Dancing",          description: "Total days you've danced.", type: "quickStat" },
  { key: "uniqueLocations",        label: "Locations",             description: "Number of places you've danced.", type: "quickStat" },
  { key: "avgDancesPerSession",    label: "Avg / Session",         description: "Average dances per session.", type: "quickStat" },
  { key: "totalLineDancesAllTime", label: "Total Line Dances",     description: "All-time line dance count.", type: "quickStat" },
  { key: "totalSwingDancesAllTime", label: "Total Swing Dances",   description: "All-time swing dance count.", type: "quickStat" },
  { key: "totalDancesThisYear",    label: "Dances This Year",      description: "Dances logged so far this year.", type: "quickStat" },
  { key: "lineDancesThisYear",     label: "Line Dances (This Year)", description: "Line dances logged this year.", type: "quickStat" },
  { key: "swingDancesThisYear",    label: "Swing (This Year)",     description: "Swing dances logged this year.", type: "quickStat" },
  { key: "lineDancesThisMonth",    label: "Line Dances (This Month)", description: "Line dances logged this month.", type: "quickStat" },
  { key: "swingDancesThisMonth",   label: "Swing (This Month)",    description: "Swing dances logged this month.", type: "quickStat" },
  { key: "uniqueDancesThisMonth",  label: "Unique Dances (This Month)", description: "Number of distinct dances you've done this month.", type: "quickStat" },
  { key: "uniqueDancesThisYear",   label: "Unique Dances (This Year)",  description: "Number of distinct dances you've done this year.", type: "quickStat" },
  { key: "top3Dances",             label: "Top 3 Line Dances",     description: "Your 3 most-danced line dances.", type: "feature" },
  { key: "top3SwingSongs",         label: "Top 3 Swing Songs",     description: "Your 3 most-danced swing songs.", type: "feature" },
];

const DEFAULT_VISIBLE = new Set([
  "monthlyRecap", "longestStreak", "totalDances", "mostRecentDance",
  "mostDancedDay", "topLocation", "danceMix", "currentFavorite", "favoriteDanceStyle",
]);

const DEFAULT_ORDER = [
  "monthlyRecap", "longestStreak", "totalDances", "mostRecentDance",
  "mostDancedDay", "topLocation", "danceMix", "currentFavorite", "favoriteDanceStyle",
  "totalDaysDancing", "uniqueLocations", "avgDancesPerSession",
  "totalLineDancesAllTime", "totalSwingDancesAllTime", "totalDancesThisYear",
  "lineDancesThisYear", "swingDancesThisYear", "lineDancesThisMonth",
  "swingDancesThisMonth", "uniqueDancesThisMonth", "uniqueDancesThisYear",
  "top3Dances", "top3SwingSongs",
];

const TYPE_LABELS: Record<CardType, string> = {
  hero: "Hero", quickStat: "Quick Stat", feature: "Feature", chart: "Chart",
};

const TYPE_GROUP_LABELS: Record<CardType, string> = {
  hero: "Recap Cards", quickStat: "Quick Stats", feature: "Highlights", chart: "Charts",
};

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

function useStyleDistribution() {
  return useQuery<{ style: string; count: number }[]>({
    queryKey: ["/api/stats/style-distribution"],
    queryFn: async () => {
      const res = await fetch("/api/stats/style-distribution", { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });
}

// Parse stored format: "!key" = explicitly hidden, "key" = visible
// New keys not in saved list are appended using their sensible default visibility
function parseHomepagePrefs(saved: string[] | null): { order: string[]; hidden: Set<string> } {
  const allKeys = ALL_STAT_KEYS.map(s => s.key);
  if (!saved) {
    const hidden = new Set(allKeys.filter(k => !DEFAULT_VISIBLE.has(k)));
    return { order: [...DEFAULT_ORDER], hidden };
  }

  const hidden = new Set<string>();
  const order: string[] = [];

  for (const entry of saved) {
    if (entry.startsWith("!")) {
      const key = entry.slice(1);
      if (allKeys.includes(key)) { hidden.add(key); order.push(key); }
    } else {
      if (allKeys.includes(entry)) order.push(entry);
    }
  }
  // Append truly new keys (added after user last saved) using their sensible default visibility
  for (const key of DEFAULT_ORDER) {
    if (!order.includes(key)) {
      order.push(key);
      if (!DEFAULT_VISIBLE.has(key)) hidden.add(key);
    }
  }
  for (const key of allKeys) {
    if (!order.includes(key)) order.push(key);
  }
  return { order, hidden };
}

function getEnabledStats(saved: string[] | null): string[] {
  const { order, hidden } = parseHomepagePrefs(saved);
  return order.filter(k => !hidden.has(k));
}

const TYPE_BADGE_CLASSES: Record<CardType, string> = {
  hero: "bg-[var(--accent-orange)]/15 text-[var(--accent-orange)]",
  quickStat: "bg-secondary/60 text-muted-foreground",
  feature: "bg-[var(--accent-gold)]/15 text-[var(--accent-gold)]",
  chart: "bg-[var(--accent-leather)]/15 text-[var(--accent-leather)]",
};

function SortableStatItem({
  id, label, description, type, isHidden, onToggle,
}: { id: string; label: string; description: string; type: CardType; isHidden: boolean; onToggle: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-center justify-between gap-2 rounded-xl px-3 py-2.5 select-none transition-colors ${
        isDragging ? "opacity-40 z-50" : isHidden ? "opacity-50 bg-secondary/20" : "opacity-100 bg-secondary/40"
      }`}
    >
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <button
          className="touch-none cursor-grab active:cursor-grabbing p-0.5 -ml-0.5 shrink-0"
          {...attributes}
          {...listeners}
          tabIndex={-1}
        >
          <GripVertical className="w-4 h-4 text-muted-foreground/50" />
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`text-sm font-medium truncate ${isHidden ? "text-muted-foreground" : ""}`}>{label}</span>
            <span className={`text-[9px] uppercase tracking-wide font-semibold px-1.5 py-0.5 rounded-full shrink-0 ${TYPE_BADGE_CLASSES[type]}`}>
              {TYPE_LABELS[type]}
            </span>
          </div>
          <p className="text-xs text-muted-foreground truncate">{description}</p>
        </div>
      </div>
      <Switch checked={!isHidden} onCheckedChange={onToggle} className="shrink-0 ml-2" />
    </div>
  );
}

function EditHomepageDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data: prefData } = useHomepageStats();
  const setStats = useSetHomepageStats();
  const { toast } = useToast();

  const [order, setOrder] = useState<string[]>([]);
  const [hiddenSet, setHiddenSet] = useState<Set<string>>(new Set());

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
  );

  useEffect(() => {
    if (open) {
      const prefs = parseHomepagePrefs(prefData?.stats ?? null);
      setOrder(prefs.order);
      setHiddenSet(new Set(prefs.hidden));
    }
  }, [open, JSON.stringify(prefData?.stats)]);

  const toggle = (key: string) => {
    setHiddenSet(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setOrder(prev => {
        const oldIndex = prev.indexOf(active.id as string);
        const newIndex = prev.indexOf(over.id as string);
        return arrayMove(prev, oldIndex, newIndex);
      });
    }
  };

  const handleSave = async () => {
    const encoded = order.map(k => hiddenSet.has(k) ? `!${k}` : k);
    await setStats.mutateAsync(encoded);
    toast({ title: "Homepage updated!" });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="rounded-2xl bg-card max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Customize Homepage</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground -mt-2">Hold the grip icon to reorder. Toggle to show/hide.</p>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={order} strategy={verticalListSortingStrategy}>
            <div className="space-y-1 max-h-[26rem] overflow-y-auto pr-1">
              {order.map((key, idx) => {
                const def = ALL_STAT_KEYS.find(s => s.key === key);
                if (!def) return null;
                const prevDef = idx > 0 ? ALL_STAT_KEYS.find(s => s.key === order[idx - 1]) : null;
                const showHeader = !prevDef || prevDef.type !== def.type;
                return (
                  <div key={key}>
                    {showHeader && (
                      <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/70 px-3 pt-3 pb-1 first:pt-0">
                        {TYPE_GROUP_LABELS[def.type]}
                      </p>
                    )}
                    <SortableStatItem
                      id={key}
                      label={def.label}
                      description={def.description}
                      type={def.type}
                      isHidden={hiddenSet.has(key)}
                      onToggle={() => toggle(key)}
                    />
                  </div>
                );
              })}
            </div>
          </SortableContext>
        </DndContext>
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

// Custom SVG donut chart — avoids recharts React 18 incompatibility
function DonutChart({ data, size = 88 }: { data: { style: string; count: number; pct: number }[]; size?: number }) {
  const r = size * 0.36;
  const strokeW = size * 0.15;
  const gap = 1.5;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;

  let offset = 0;
  const slices = data.map(d => {
    const dash = (d.pct / 100) * circumference - gap;
    const slice = { ...d, dash, offset };
    offset += (d.pct / 100) * circumference;
    return slice;
  });

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {slices.map(s => {
        const info = STYLE_INFO[s.style as StyleOption];
        return (
          <circle key={s.style} cx={cx} cy={cy} r={r}
            fill="none"
            stroke={info?.color ?? "#888"}
            strokeWidth={strokeW}
            strokeDasharray={`${s.dash} ${circumference - s.dash}`}
            strokeDashoffset={-(s.offset) + circumference / 4}
            style={{ transition: "stroke-dasharray 0.5s" }} />
        );
      })}
    </svg>
  );
}

export default function Home() {
  const [, setLocation] = useLocation();
  const { data: profile, isLoading: profileLoading } = useProfile();
  const { data: stats, isLoading: statsLoading } = useStats();
  const { data: prefData } = useHomepageStats();
  const { data: styleDist = [] } = useStyleDistribution();
  const { data: unseenData } = useUnseenAchievements();
  const markSeen = useMarkAchievementsSeen();
  const [editOpen, setEditOpen] = useState(false);
  const unseenCount = unseenData?.count ?? 0;

  const enabledStats = getEnabledStats(prefData?.stats ?? null);

  const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.07 } } };
  const item = { hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0 } };

  const mostDancedDayLabel = stats?.mostDancedDay
    ? `${format(new Date(stats.mostDancedDay.date + "T12:00:00"), "MMM d, yyyy")} · ${stats.mostDancedDay.count} dance${stats.mostDancedDay.count !== 1 ? "s" : ""}`
    : "—";

  const totalStyleDances = styleDist.reduce((s, r) => s + r.count, 0);
  const pieData = styleDist
    .filter(r => r.count > 0)
    .map(r => ({
      style: r.style,
      count: r.count,
      pct: totalStyleDances > 0 ? Math.round((r.count / totalStyleDances) * 100) : 0,
    }));
  const favStyle = pieData.reduce<typeof pieData[0] | null>((best, cur) => !best || cur.count > best.count ? cur : best, null);

  // Default (quick stat) card look — neutral warm surface, orange accent icon
  const quickStatClass = "bg-[var(--card-default)] border-[var(--card-border)] text-[var(--text-main)]";
  const featureClass = "bg-[var(--card-secondary)] border-[var(--card-border)]";
  const sageFeatureClass = "bg-[var(--card-sage)] border-[var(--card-border)]";

  // --- Card renderer — different visual treatment per card `type` ---
  const renderCard = (key: string) => {
    switch (key) {
      case "monthlyRecap":
        return (
          <div className="rounded-2xl border p-6 transition-all duration-300 hover:shadow-md"
            style={{ background: "var(--card-hero)", borderColor: "var(--border-medium)" }}>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-4 h-4" style={{ color: "var(--accent-orange)" }} />
              <span className="text-sm font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                This Month's LineUp
              </span>
            </div>
            <div className="text-5xl md:text-6xl font-display font-bold leading-none mt-2" style={{ color: "var(--text-main)" }}>
              {stats?.dancesThisMonth ?? 0}
            </div>
            <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>dances this month</p>
            <div className="grid grid-cols-3 gap-3 mt-5 pt-4 border-t" style={{ borderColor: "var(--border-medium)" }}>
              <div>
                <p className="text-lg font-display font-bold" style={{ color: "var(--text-main)" }}>{stats?.totalDaysDancing ?? 0}</p>
                <p className="text-[11px] uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>Days Dancing</p>
              </div>
              <div>
                <p className="text-lg font-display font-bold" style={{ color: "var(--text-main)" }}>{stats?.uniqueLocations ?? 0}</p>
                <p className="text-[11px] uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>Locations</p>
              </div>
              <div>
                <p className="text-lg font-display font-bold" style={{ color: "var(--text-main)" }}>{stats?.avgDancesPerSession ?? 0}</p>
                <p className="text-[11px] uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>Avg/Session</p>
              </div>
            </div>
          </div>
        );

      // --- Quick stat cards: compact, share the same neutral warm surface ---
      case "totalDances":
        return <StatCard label="Total Dances (All Time)" value={stats?.totalDances ?? 0} icon={Music2} className={quickStatClass} />;
      case "longestStreak":
        return <StatCard label="Longest Streak" value={`${stats?.longestStreak ?? 0} Days`} icon={Flame} className={quickStatClass} />;
      case "totalDaysDancing":
        return <StatCard label="Days Dancing" value={stats?.totalDaysDancing ?? 0} icon={CalendarDays} className={quickStatClass} />;
      case "uniqueLocations":
        return <StatCard label="Locations" value={stats?.uniqueLocations ?? 0} icon={MapPin} className={quickStatClass} />;
      case "avgDancesPerSession":
        return <StatCard label="Avg / Session" value={stats?.avgDancesPerSession ?? 0} icon={Zap} className={quickStatClass} />;
      case "totalLineDancesAllTime":
        return <StatCard label="Total Line Dances" value={stats?.totalLineDancesAllTime ?? 0} icon={Music2} className={quickStatClass} />;
      case "totalSwingDancesAllTime":
        return <StatCard label="Total Swing Dances" value={stats?.totalSwingDancesAllTime ?? 0} icon={Sparkles} className={quickStatClass} />;
      case "totalDancesThisYear":
        return <StatCard label="Dances This Year" value={stats?.totalDancesThisYear ?? 0} icon={CalendarDays} className={quickStatClass} />;
      case "lineDancesThisYear":
        return <StatCard label="Line Dances (This Year)" value={stats?.lineDancesThisYear ?? 0} icon={CalendarDays} className={quickStatClass} />;
      case "swingDancesThisYear":
        return <StatCard label="Swing (This Year)" value={stats?.swingDancesThisYear ?? 0} icon={CalendarDays} className={quickStatClass} />;
      case "lineDancesThisMonth":
        return <StatCard label="Line Dances (This Month)" value={stats?.lineDancesThisMonth ?? 0} icon={TrendingUp} className={quickStatClass} />;
      case "swingDancesThisMonth":
        return <StatCard label="Swing (This Month)" value={stats?.swingDancesThisMonth ?? 0} icon={TrendingUp} className={quickStatClass} />;
      case "uniqueDancesThisMonth":
        return <StatCard label="Unique Dances (This Month)" value={stats?.uniqueDancesThisMonth ?? 0} icon={Footprints} className={quickStatClass} />;
      case "uniqueDancesThisYear":
        return <StatCard label="Unique Dances (This Year)" value={stats?.uniqueDancesThisYear ?? 0} icon={Footprints} className={quickStatClass} />;

      // --- Feature cards: full-width, richer layout ---
      case "mostRecentDance":
        return (
          <div className={`rounded-2xl border p-5 transition-all duration-300 hover:shadow-md flex items-center gap-4 ${featureClass}`}>
            <div className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "var(--accent-orange)" }}>
              <Clock className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Recently Added</p>
              <p className="text-xl font-display font-bold truncate" style={{ color: "var(--text-main)" }}>{stats?.mostRecentDance || "—"}</p>
              {(stats?.mostRecentStyle) && (
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  {stats.mostRecentStyle === "LINE" ? "Line Dance" : STYLE_INFO[stats.mostRecentStyle as StyleOption]?.short}
                </p>
              )}
            </div>
          </div>
        );
      case "mostDancedDay":
        return (
          <div className={`rounded-2xl border p-5 transition-all duration-300 hover:shadow-md flex items-center gap-4 ${featureClass}`}>
            <div className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "var(--accent-orange)" }}>
              <BarChart2 className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Best Night</p>
              <p className="text-xl font-display font-bold truncate" style={{ color: "var(--text-main)" }}>{mostDancedDayLabel}</p>
            </div>
          </div>
        );
      case "topLocation":
        return (
          <div className={`rounded-2xl border p-5 transition-all duration-300 hover:shadow-md flex items-center gap-4 ${sageFeatureClass}`}>
            <div className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "var(--accent-orange)" }}>
              <MapPin className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Top Location</p>
              <p className="text-xl font-display font-bold truncate" style={{ color: "var(--text-main)" }}>{stats?.mostFrequentLocation || "—"}</p>
              {stats?.mostFrequentLocationCount ? (
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>{stats.mostFrequentLocationCount} visits</p>
              ) : null}
            </div>
          </div>
        );
      case "currentFavorite":
        return (
          <div className={`rounded-2xl border p-5 transition-all duration-300 hover:shadow-md flex items-center gap-4 ${featureClass}`}>
            <div className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "var(--accent-orange)" }}>
              <Heart className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Current Favorite</p>
              <p className="text-xl font-display font-bold truncate" style={{ color: "var(--text-main)" }}>
                {stats?.currentFavorite && stats.currentFavorite !== "N/A" ? stats.currentFavorite : "—"}
              </p>
            </div>
          </div>
        );
      case "favoriteDanceStyle":
        return (
          <div className={`rounded-2xl border p-5 transition-all duration-300 hover:shadow-md ${featureClass}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Favorite Style</span>
              <Star className="w-4 h-4" style={{ color: "var(--accent-orange)" }} />
            </div>
            {favStyle ? (() => {
              const info = STYLE_INFO[favStyle.style as StyleOption];
              return (
                <div>
                  <p className="text-2xl font-display font-bold leading-tight" style={{ color: info?.color ?? "var(--text-main)" }}>
                    {info?.label ?? favStyle.style}
                  </p>
                  <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{favStyle.pct}% of dances</p>
                </div>
              );
            })() : (
              <p className="text-2xl font-display font-bold" style={{ color: "var(--text-main)" }}>—</p>
            )}
          </div>
        );
      case "top3Dances":
        return (
          <div className={`rounded-2xl border p-5 transition-all duration-300 hover:shadow-md ${featureClass}`}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Top 3 Line Dances</span>
              <Footprints className="w-4 h-4" style={{ color: "var(--accent-orange)" }} />
            </div>
            {stats?.top3Dances?.length ? (
              <div className="space-y-2">
                {stats.top3Dances.map((dance, idx) => (
                  <div key={`${dance.danceName}-${idx}`} className="flex items-center gap-2">
                    <span className="text-xs font-bold w-4" style={{ color: "var(--accent-orange)" }}>{idx + 1}.</span>
                    <span className="font-semibold font-display text-sm leading-tight truncate flex-1" style={{ color: "var(--text-main)" }}>{dance.danceName}</span>
                    <span className="text-xs flex-shrink-0" style={{ color: "var(--text-muted)" }}>{dance.count}x</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-2xl font-display font-bold" style={{ color: "var(--text-main)" }}>—</p>
            )}
          </div>
        );
      case "top3SwingSongs":
        return (
          <div className={`rounded-2xl border p-5 transition-all duration-300 hover:shadow-md ${featureClass}`}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Top 3 Swing Songs</span>
              <Sparkles className="w-4 h-4" style={{ color: "var(--accent-orange)" }} />
            </div>
            {stats?.top3SwingSongs?.length ? (
              <div className="space-y-2">
                {stats.top3SwingSongs.map((song, idx) => (
                  <div key={`${song.songName}-${idx}`} className="flex items-center gap-2">
                    <span className="text-xs font-bold w-4" style={{ color: "var(--accent-orange)" }}>{idx + 1}.</span>
                    <span className="font-semibold font-display text-sm leading-tight truncate flex-1" style={{ color: "var(--text-main)" }}>{song.songName}</span>
                    <span className="text-xs flex-shrink-0" style={{ color: "var(--text-muted)" }}>{song.count}x</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-2xl font-display font-bold" style={{ color: "var(--text-main)" }}>—</p>
            )}
          </div>
        );

      // --- Chart card ---
      case "danceMix":
        return (
          <div className="rounded-2xl border p-5 transition-all duration-300 hover:shadow-md"
            style={{ background: "var(--card-default)", borderColor: "var(--card-border)" }}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Dance Mix</span>
              <PieIcon className="w-4 h-4" style={{ color: "var(--accent-leather)" }} />
            </div>
            {pieData.length === 0 ? (
              <p className="text-2xl font-display font-bold" style={{ color: "var(--text-main)" }}>—</p>
            ) : (
              <div className="flex items-center gap-5">
                <DonutChart data={pieData} size={88} />
                <div className="space-y-1.5 flex-1">
                  {[...pieData].sort((a, b) => b.count - a.count).map(entry => {
                    const info = STYLE_INFO[entry.style as StyleOption];
                    return (
                      <div key={entry.style} className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: info?.color ?? "#888" }} />
                        <span className="text-xs font-medium truncate flex-1" style={{ color: "var(--text-main)" }}>{info?.short ?? entry.style}</span>
                        <span className="text-xs" style={{ color: "var(--text-muted)" }}>{entry.pct}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  // Build layout: quickStat cards pair up 2-per-row; hero/feature/chart cards render full-width
  const cardTypeOf = (key: string) => ALL_STAT_KEYS.find(s => s.key === key)?.type;
  type LayoutRow = { keys: string[]; fullWidth: boolean };
  const layoutRows: LayoutRow[] = [];
  let buf: string[] = [];
  for (const key of enabledStats) {
    if (cardTypeOf(key) === "quickStat") {
      buf.push(key);
      if (buf.length === 2) { layoutRows.push({ keys: [...buf], fullWidth: false }); buf = []; }
    } else {
      if (buf.length) { layoutRows.push({ keys: [...buf], fullWidth: false }); buf = []; }
      layoutRows.push({ keys: [key], fullWidth: true });
    }
  }
  if (buf.length) layoutRows.push({ keys: buf, fullWidth: false });

  return (
    <div className="container px-4 pb-28 pt-8 mx-auto max-w-5xl">
      {unseenCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 bg-primary/10 border border-primary/30 rounded-2xl p-4 flex items-center gap-3 cursor-pointer active:scale-[0.98] transition-transform"
          onClick={() => { markSeen.mutate(); setLocation("/achievements"); }}
          data-testid="banner-new-achievements"
        >
          <Trophy className="w-5 h-5 text-primary flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-primary leading-tight">
              New Badge{unseenCount > 1 ? "s" : ""} Unlocked!
            </p>
            <p className="text-xs text-muted-foreground">Tap to view your achievements</p>
          </div>
          <ChevronRight className="w-4 h-4 text-primary flex-shrink-0" />
        </motion.div>
      )}

      <div className="mb-8 space-y-1">
        {profileLoading ? (
          <Skeleton className="h-10 w-48 rounded-lg" />
        ) : (
          <motion.h1 initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
            className="text-3xl md:text-4xl font-display font-bold text-foreground">
            Hey, {profile?.firstName || "Dancer"}
          </motion.h1>
        )}
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
          className="text-muted-foreground text-lg">Ready to get dancing?</motion.p>
      </div>

      {statsLoading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}
          </div>
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}
        </div>
      ) : (
        <motion.div variants={container} initial="hidden" animate="show" className="space-y-4">
          {layoutRows.map((row, rowIdx) => {
            if (row.fullWidth) {
              const card = renderCard(row.keys[0]);
              if (!card) return null;
              return (
                <motion.div key={`row-${rowIdx}`} variants={item}>
                  {card}
                </motion.div>
              );
            }
            if (row.keys.length === 1) {
              const card = renderCard(row.keys[0]);
              if (!card) return null;
              return (
                <motion.div key={`row-${rowIdx}`} variants={item} className="grid grid-cols-2 gap-4">
                  <div>{card}</div>
                </motion.div>
              );
            }
            return (
              <motion.div key={`row-${rowIdx}`} variants={item} className="grid grid-cols-2 gap-4">
                {row.keys.map(key => {
                  const card = renderCard(key);
                  if (!card) return null;
                  return <div key={key}>{card}</div>;
                })}
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {/* Edit Homepage button */}
      <div className="mt-8 flex justify-center">
        <Button variant="outline" className="rounded-xl gap-2 text-muted-foreground border-2"
          onClick={() => setEditOpen(true)} data-testid="button-edit-homepage">
          <Settings2 className="w-4 h-4" /> Edit Homepage
        </Button>
      </div>

      <EditHomepageDialog open={editOpen} onClose={() => setEditOpen(false)} />
    </div>
  );
}
