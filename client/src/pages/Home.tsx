import { useState, useEffect } from "react";
import { useProfile } from "@/hooks/use-profile";
import { useStats } from "@/hooks/use-stats";
import { StatCard } from "@/components/StatCard";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { STYLE_INFO, type StyleOption } from "@shared/schema";
import {
  Music2, CalendarDays, MapPin, Flame, Trophy, Activity,
  TrendingUp, Clock, BarChart2, Star, Zap, Settings2, Check, PieChart as PieIcon, GripVertical
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const ALL_STAT_KEYS = [
  { key: "totalDances",         label: "Total Dances" },
  { key: "longestStreak",       label: "Longest Streak" },
  { key: "totalDaysDancing",    label: "Days Dancing" },
  { key: "uniqueLocations",     label: "Locations" },
  { key: "dancesThisMonth",     label: "Dances This Month" },
  { key: "avgDancesPerSession", label: "Avg Dances per Session" },
  { key: "mostDancedDay",       label: "Most Danced Day" },
  { key: "mostRecentDance",     label: "Most Recently Added" },
  { key: "topLocation",         label: "Favorite Location" },
  { key: "top3Dances",          label: "Top 3 Line Dances" },
  { key: "top3SwingSongs",      label: "Top 3 Swing Songs" },
  { key: "favoriteDance",       label: "Favorite Dance" },
  { key: "danceMix",            label: "Your Dance Mix" },
  { key: "favoriteDanceStyle",  label: "Favorite Dance Style" },
];

// These cards are always full-width
const LARGE_KEYS = new Set(["top3Dances", "top3SwingSongs", "danceMix"]);

const CARD_COLORS: Record<string, string> = {
  totalDances:         "bg-[#FDEBD5] border-[#ECC9A8] hover:border-[#D9A87A]",
  longestStreak:       "bg-[#FDD9D5] border-[#F0B5AE] hover:border-[#DE9088]",
  totalDaysDancing:    "bg-[#D5EDD6] border-[#AACBAB] hover:border-[#82AA83]",
  uniqueLocations:     "bg-[#D5E5F5] border-[#A8C4E0] hover:border-[#7BA3C8]",
  dancesThisMonth:     "bg-[#FBF0D0] border-[#E8D398] hover:border-[#CDB66A]",
  avgDancesPerSession: "bg-[#EAD8F8] border-[#CCACEC] hover:border-[#A87ED8]",
  mostDancedDay:       "bg-[#F8D8E8] border-[#ECAED0] hover:border-[#D882AF]",
  mostRecentDance:     "bg-[#D5EEE8] border-[#A5D4CA] hover:border-[#6FBAA8]",
  topLocation:         "bg-[#FFF5D5] border-[#EDDC98] hover:border-[#D4C064]",
  top3Dances:          "bg-[#DCE0F8] border-[#AABAE8] hover:border-[#7A91D4]",
  top3SwingSongs:      "bg-[#D5F0F8] border-[#A5D4E8] hover:border-[#6FBAD4]",
  favoriteDance:       "bg-[#FDE8C0] border-[#EDCA88] hover:border-[#D4A84E]",
  danceMix:            "bg-[#F5ECD8] border-[#DCCEB0] hover:border-[#C0AB80]",
  favoriteDanceStyle:  "bg-[#E8D5C8] border-[#CAAED0] hover:border-[#D88098]",
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

// Merge saved prefs with ALL_STAT_KEYS: add any newly-introduced keys at end
function mergeWithDefaults(saved: string[] | null): string[] {
  const allKeys = ALL_STAT_KEYS.map(s => s.key);
  if (!saved) return allKeys;
  const newKeys = allKeys.filter(k => !saved.includes(k));
  return [...saved, ...newKeys];
}

function EditHomepageDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data: prefData } = useHomepageStats();
  const setStats = useSetHomepageStats();
  const { toast } = useToast();

  const merged = mergeWithDefaults(prefData?.stats ?? null);
  const [enabled, setEnabled] = useState<string[]>(merged);
  const [draggedKey, setDraggedKey] = useState<string | null>(null);

  // Re-sync local state whenever dialog opens or remote prefs change
  useEffect(() => {
    if (open) setEnabled(mergeWithDefaults(prefData?.stats ?? null));
  }, [open, prefData?.stats?.join(",")]);

  const toggle = (key: string) =>
    setEnabled(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );

  const handleDragOver = (e: React.DragEvent, targetKey: string) => {
    e.preventDefault();
    if (!draggedKey || draggedKey === targetKey) return;
    setEnabled(prev => {
      const from = prev.indexOf(draggedKey);
      const to = prev.indexOf(targetKey);
      if (from === -1 || to === -1) return prev;
      const next = [...prev];
      next.splice(from, 1);
      next.splice(to, 0, draggedKey);
      return next;
    });
  };

  const handleSave = async () => {
    await setStats.mutateAsync(enabled);
    toast({ title: "Homepage updated!" });
    onClose();
  };

  // Enabled items (in saved order) and disabled items (below)
  const enabledInOrder = enabled
    .map(key => ALL_STAT_KEYS.find(s => s.key === key)!)
    .filter(Boolean);
  const disabledItems = ALL_STAT_KEYS.filter(s => !enabled.includes(s.key));

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="rounded-2xl bg-card max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Customize Homepage</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground -mt-2">Drag to reorder. Toggle to show/hide.</p>
        <div className="space-y-1 max-h-[26rem] overflow-y-auto pr-1">
          {/* Enabled — draggable */}
          {enabledInOrder.map(({ key, label }) => (
            <div
              key={key}
              draggable
              onDragStart={() => setDraggedKey(key)}
              onDragOver={e => handleDragOver(e, key)}
              onDragEnd={() => setDraggedKey(null)}
              className={`flex items-center justify-between rounded-xl px-3 py-2.5 bg-secondary/40 cursor-grab active:cursor-grabbing select-none transition-opacity ${draggedKey === key ? "opacity-40" : "opacity-100"}`}
            >
              <div className="flex items-center gap-2">
                <GripVertical className="w-4 h-4 text-muted-foreground/50 flex-shrink-0" />
                <span className="text-sm font-medium">{label}</span>
              </div>
              <Switch checked onCheckedChange={() => toggle(key)} />
            </div>
          ))}

          {/* Disabled — below, non-draggable */}
          {disabledItems.length > 0 && (
            <>
              <div className="pt-1 pb-0.5 px-1">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground/50 font-medium">Hidden</p>
              </div>
              {disabledItems.map(({ key, label }) => (
                <div key={key} className="flex items-center justify-between rounded-xl px-3 py-2.5 bg-secondary/20 opacity-60">
                  <div className="flex items-center gap-2">
                    <GripVertical className="w-4 h-4 text-muted-foreground/30 flex-shrink-0" />
                    <span className="text-sm font-medium text-muted-foreground">{label}</span>
                  </div>
                  <Switch checked={false} onCheckedChange={() => toggle(key)} />
                </div>
              ))}
            </>
          )}
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

// Custom SVG donut chart — avoids recharts React 18 incompatibility
function DonutChart({ data }: { data: { style: string; count: number; pct: number }[] }) {
  const size = 144;
  const r = 52;
  const gap = 2;
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
            strokeWidth={22}
            strokeDasharray={`${s.dash} ${circumference - s.dash}`}
            strokeDashoffset={-(s.offset) + circumference / 4}
            style={{ transition: "stroke-dasharray 0.5s" }} />
        );
      })}
      <circle cx={cx} cy={cy} r={r - 14} fill="none" />
    </svg>
  );
}

export default function Home() {
  const { data: profile, isLoading: profileLoading } = useProfile();
  const { data: stats, isLoading: statsLoading } = useStats();
  const { data: prefData } = useHomepageStats();
  const { data: styleDist = [] } = useStyleDistribution();
  const [editOpen, setEditOpen] = useState(false);

  // Merge saved prefs with all keys (auto-adds new keys users haven't seen)
  const enabledStats = mergeWithDefaults(prefData?.stats ?? null);

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

  const cardColor = (key: string) => CARD_COLORS[key] ?? "bg-secondary/40 border-border";

  // --- Card renderers ---
  const renderSmallCard = (key: string) => {
    switch (key) {
      case "totalDances":
        return <StatCard label="Total Dances" value={stats?.totalDances ?? 0} icon={Music2} className={cardColor(key)} />;
      case "longestStreak":
        return <StatCard label="Longest Streak" value={`${stats?.longestStreak ?? 0} Days`} icon={Flame} className={cardColor(key)} />;
      case "totalDaysDancing":
        return <StatCard label="Days Dancing" value={stats?.totalDaysDancing ?? 0} icon={CalendarDays} className={cardColor(key)} />;
      case "uniqueLocations":
        return <StatCard label="Locations" value={stats?.uniqueLocations ?? 0} icon={MapPin} className={cardColor(key)} />;
      case "dancesThisMonth":
        return <StatCard label="Dances This Month" value={stats?.dancesThisMonth ?? 0} icon={TrendingUp} className={cardColor(key)} />;
      case "avgDancesPerSession":
        return <StatCard label="Avg Dances per Session" value={stats?.avgDancesPerSession ?? 0} icon={Zap} className={cardColor(key)} />;
      case "mostDancedDay":
        return <StatCard label="Most Danced Day" value={mostDancedDayLabel} icon={BarChart2} className={cardColor(key)} />;
      case "mostRecentDance":
        return (
          <StatCard
            label="Most Recently Added"
            value={stats?.mostRecentDance || "—"}
            description={stats?.mostRecentStyle && stats.mostRecentStyle !== "LINE"
              ? STYLE_INFO[stats.mostRecentStyle as StyleOption]?.short
              : stats?.mostRecentStyle === "LINE" ? "Line Dance" : undefined}
            icon={Clock} className={cardColor(key)} />
        );
      case "topLocation":
        return (
          <StatCard label="Favorite Location" value={stats?.mostFrequentLocation || "—"}
            description={stats?.mostFrequentLocationCount ? `${stats.mostFrequentLocationCount} visits` : undefined}
            icon={Trophy} className={cardColor(key)} />
        );
      case "favoriteDance":
        return (
          <StatCard
            label="Favorite Dance"
            value={stats?.mostFrequentSongName || "—"}
            description={stats?.mostFrequentDance && stats.mostFrequentDanceCount
              ? `${stats.mostFrequentDance} · ${stats.mostFrequentDanceCount}x`
              : stats?.mostFrequentDance || undefined}
            icon={Star} className={cardColor(key)} />
        );
      case "favoriteDanceStyle":
        return (
          <div className={`rounded-2xl border p-5 transition-all duration-300 hover:shadow-md hover:-translate-y-1 h-full flex flex-col justify-between ${cardColor(key)}`}>
            <div className="flex items-start justify-between mb-2">
              <span className="text-sm font-medium uppercase tracking-wider text-[#5c473a]">Favorite Dance Style</span>
            </div>
            {favStyle ? (() => {
              const info = STYLE_INFO[favStyle.style as StyleOption];
              return (
                <div>
                  <p className="text-2xl md:text-3xl font-display font-bold" style={{ color: info?.color }}>
                    {info?.label ?? favStyle.style}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">{favStyle.pct}% of your dances</p>
                </div>
              );
            })() : (
              <p className="text-2xl font-display font-bold text-foreground">—</p>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  const renderLargeCard = (key: string) => {
    switch (key) {
      case "top3Dances":
        return (
          <div className={`rounded-2xl border p-5 transition-all duration-300 hover:shadow-md hover:-translate-y-1 ${cardColor(key)}`}>
            <div className="flex items-start justify-between mb-3">
              <span className="text-sm font-medium uppercase tracking-wider text-[#5c473a]">Top 3 Line Dances</span>
              <Activity className="w-5 h-5 text-primary/50" />
            </div>
            {stats?.top3Dances?.length ? (
              <div className="space-y-2">
                {stats.top3Dances.map((dance, idx) => (
                  <div key={`${dance.danceName}-${dance.songName}`} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {idx === 0 && <Trophy className="w-4 h-4 text-yellow-500" />}
                      {idx === 1 && <Trophy className="w-4 h-4 text-slate-400" />}
                      {idx === 2 && <Trophy className="w-4 h-4 text-amber-600" />}
                      <div>
                        <span className="font-semibold text-foreground font-display block leading-tight">{dance.danceName}</span>
                        {dance.songName && dance.songName !== dance.danceName && (
                          <span className="text-xs text-muted-foreground">{dance.songName}</span>
                        )}
                      </div>
                    </div>
                    <span className="text-sm text-muted-foreground">{dance.count}x</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-foreground font-bold font-display text-2xl">—</p>
            )}
          </div>
        );
      case "top3SwingSongs":
        return (
          <div className={`rounded-2xl border p-5 transition-all duration-300 hover:shadow-md hover:-translate-y-1 ${cardColor(key)}`}>
            <div className="flex items-start justify-between mb-3">
              <span className="text-sm font-medium uppercase tracking-wider text-[#5c473a]">Top 3 Swing Songs</span>
              <Activity className="w-5 h-5 text-primary/50" />
            </div>
            {stats?.top3SwingSongs?.length ? (
              <div className="space-y-2">
                {stats.top3SwingSongs.map((song, idx) => {
                  const info = STYLE_INFO[song.style as StyleOption];
                  return (
                    <div key={`${song.songName}-${song.style}`} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {idx === 0 && <Trophy className="w-4 h-4 text-yellow-500" />}
                        {idx === 1 && <Trophy className="w-4 h-4 text-slate-400" />}
                        {idx === 2 && <Trophy className="w-4 h-4 text-amber-600" />}
                        <div>
                          <span className="font-semibold text-foreground font-display block leading-tight">{song.songName}</span>
                          <span className="text-xs font-medium" style={{ color: info?.color }}>{info?.short ?? song.style}</span>
                        </div>
                      </div>
                      <span className="text-sm text-muted-foreground">{song.count}x</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-foreground font-bold font-display text-2xl">—</p>
            )}
          </div>
        );
      case "danceMix":
        return (
          <div className={`rounded-2xl border p-5 transition-all duration-300 hover:shadow-md ${cardColor(key)}`}>
            <div className="flex items-start justify-between mb-4">
              <span className="text-sm font-medium uppercase tracking-wider text-[#5c473a]">Your Dance Mix</span>
              <PieIcon className="w-5 h-5 text-primary/50" />
            </div>
            {pieData.length === 0 ? (
              <p className="text-foreground font-bold font-display text-2xl">—</p>
            ) : (
              <div className="flex items-center gap-6">
                <div className="w-36 h-36 flex-shrink-0">
                  <DonutChart data={pieData} />
                </div>
                <div className="space-y-1.5 flex-1 min-w-0">
                  {pieData.sort((a, b) => b.count - a.count).map(entry => {
                    const info = STYLE_INFO[entry.style as StyleOption];
                    return (
                      <div key={entry.style} className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: info?.color ?? "#888" }} />
                        <span className="text-sm font-medium truncate">{info?.short ?? entry.style}</span>
                        <span className="text-xs text-muted-foreground ml-auto">{entry.pct}%</span>
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

  // Build layout rows from enabledStats order
  type LayoutRow =
    | { type: "large"; key: string }
    | { type: "row"; keys: string[] };

  const layoutRows: LayoutRow[] = [];
  let smallBuf: string[] = [];
  for (const key of enabledStats) {
    if (LARGE_KEYS.has(key)) {
      if (smallBuf.length) { layoutRows.push({ type: "row", keys: [...smallBuf] }); smallBuf = []; }
      layoutRows.push({ type: "large", key });
    } else {
      smallBuf.push(key);
      if (smallBuf.length === 2) { layoutRows.push({ type: "row", keys: [...smallBuf] }); smallBuf = []; }
    }
  }
  if (smallBuf.length) layoutRows.push({ type: "row", keys: smallBuf });

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
            if (row.type === "large") {
              const card = renderLargeCard(row.key);
              if (!card) return null;
              return (
                <motion.div key={row.key} variants={item}>
                  {card}
                </motion.div>
              );
            }
            // Small row: 1 or 2 cards
            if (row.keys.length === 1) {
              const card = renderSmallCard(row.keys[0]);
              if (!card) return null;
              return (
                <motion.div key={`row-${rowIdx}`} variants={item} className="flex justify-center">
                  <div className="w-1/2 pr-2">
                    {card}
                  </div>
                </motion.div>
              );
            }
            return (
              <motion.div key={`row-${rowIdx}`} variants={item} className="grid grid-cols-2 gap-4">
                {row.keys.map(key => {
                  const card = renderSmallCard(key);
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
