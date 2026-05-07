import { useState, useEffect, useRef } from "react";
import {
  useBuddies, useBuddyRequests, useSearchUsers,
  useSendBuddyRequest, useRespondToBuddyRequest,
  useRemoveBuddy,
  type BuddyPublicStats,
} from "@/hooks/use-buddies";
import { useDanceOffs, useCreateDanceOff, useJoinDanceOff, useClearDanceOffResults, useDeleteDanceOffResult, type DanceOffResult } from "@/hooks/use-danceoffs";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Search, UserPlus, UserCheck, UserX, Flame, X, RefreshCw, Trophy, Swords, Users, Copy, Clock, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Slider } from "@/components/ui/slider";

function AvatarCircle({ firstName, avatar, size = "md" }: { firstName: string; avatar?: string; size?: "sm" | "md" }) {
  const sizeClass = size === "sm" ? "w-9 h-9 text-base" : "w-11 h-11 text-lg";
  return (
    <div className={`${sizeClass} rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0 overflow-hidden border border-border/50`}>
      {avatar ? (
        <img src={avatar} alt={firstName} className="w-full h-full object-cover" />
      ) : (
        <span className="font-display font-bold text-primary">{firstName.charAt(0).toUpperCase()}</span>
      )}
    </div>
  );
}

function StatPill({ label, value, highlight }: { label: string; value: string | number; highlight?: boolean }) {
  return (
    <div className={`rounded-xl p-2 text-center ${highlight ? "bg-primary/10" : "bg-secondary/40"}`}>
      <p className={`text-base font-bold font-display ${highlight ? "text-primary" : ""}`}>{value}</p>
      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
    </div>
  );
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <Trophy className="w-5 h-5 text-yellow-500 flex-shrink-0" />;
  if (rank === 2) return <Trophy className="w-5 h-5 text-slate-400 flex-shrink-0" />;
  if (rank === 3) return <Trophy className="w-5 h-5 text-amber-600 flex-shrink-0" />;
  return <span className="text-sm font-bold text-muted-foreground w-5 text-center flex-shrink-0">{rank}.</span>;
}

function BuddyCard({ buddy, rank, onRemove }: { buddy: BuddyPublicStats & { songCount?: number }; rank: number; onRemove: (userId: number) => void }) {
  return (
    <motion.div layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
      className="bg-card rounded-2xl border border-border p-4 shadow-sm" data-testid={`buddy-card-${buddy.userId}`}>
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <RankBadge rank={rank} />
          <AvatarCircle firstName={buddy.firstName} avatar={buddy.avatar} />
          <div>
            <p className="font-bold text-base">{buddy.firstName}</p>
            <p className="text-xs text-muted-foreground">@{buddy.username}</p>
          </div>
        </div>
        <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-destructive"
          onClick={() => onRemove(buddy.userId)} data-testid={`button-remove-buddy-${buddy.userId}`}>
          <X className="w-3.5 h-3.5" />
        </Button>
      </div>
      <div className="grid grid-cols-3 gap-2 mb-3">
        <StatPill label="In Library" value={(buddy as any).songCount ?? buddy.totalDances} />
        <StatPill label="Best Streak" value={`${buddy.longestStreak}d`} highlight />
        <StatPill label="Days Active" value={buddy.totalDaysDancing} />
      </div>
      {buddy.currentStreak > 0 && (
        <div className="flex items-center gap-1.5 text-sm text-orange-500 font-medium mb-2">
          <Flame className="w-4 h-4" /><span>{buddy.currentStreak}-day streak going!</span>
        </div>
      )}
      {buddy.favoriteDance !== "N/A" && (
        <p className="text-xs text-muted-foreground">Favorite: <span className="font-medium text-foreground">{buddy.favoriteDance}</span></p>
      )}
    </motion.div>
  );
}

function formatMs(ms: number) {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function SwipeableCard({ children, onDelete }: { children: React.ReactNode; onDelete: () => void }) {
  const [swipeX, setSwipeX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startXRef = useRef(0);
  const THRESHOLD = 80;

  const handleStart = (clientX: number) => {
    startXRef.current = clientX;
    setIsDragging(true);
  };
  const handleMove = (clientX: number) => {
    if (!isDragging) return;
    const diff = clientX - startXRef.current;
    if (diff < 0) setSwipeX(Math.max(diff, -120));
  };
  const handleEnd = () => {
    setIsDragging(false);
    if (swipeX < -THRESHOLD) {
      onDelete();
    } else {
      setSwipeX(0);
    }
  };

  return (
    <div className="relative overflow-hidden rounded-2xl">
      <div className="absolute inset-y-0 right-0 w-24 flex items-center justify-end pr-5 bg-destructive rounded-2xl">
        <Trash2 className="w-5 h-5 text-white" />
      </div>
      <div
        style={{ transform: `translateX(${swipeX}px)`, transition: isDragging ? "none" : "transform 0.3s ease" }}
        onTouchStart={e => handleStart(e.touches[0].clientX)}
        onTouchMove={e => handleMove(e.touches[0].clientX)}
        onTouchEnd={handleEnd}
        onMouseDown={e => handleStart(e.clientX)}
        onMouseMove={e => isDragging && handleMove(e.clientX)}
        onMouseUp={handleEnd}
        onMouseLeave={handleEnd}
      >
        {children}
      </div>
    </div>
  );
}

function DanceOffCard({ danceOff, currentUserId }: { danceOff: DanceOffResult; currentUserId?: number }) {
  const [msLeft, setMsLeft] = useState(danceOff.msRemaining);

  useEffect(() => {
    if (danceOff.status !== "active" || msLeft <= 0) return;
    const t = setInterval(() => setMsLeft(p => Math.max(0, p - 1000)), 1000);
    return () => clearInterval(t);
  }, [danceOff.status, msLeft]);

  const sorted = [...danceOff.participants].sort((a, b) => {
    const aCount = danceOff.status === "completed" ? (a.finalDanceCount ?? 0) : (a.liveDanceCount ?? 0);
    const bCount = danceOff.status === "completed" ? (b.finalDanceCount ?? 0) : (b.liveDanceCount ?? 0);
    return bCount - aCount;
  });

  const { toast } = useToast();

  const copyCode = () => {
    if (danceOff.joinCode) {
      navigator.clipboard.writeText(danceOff.joinCode);
      toast({ title: "Join code copied!" });
    }
  };

  return (
    <motion.div layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl border p-4 shadow-sm ${danceOff.status === "active" ? "bg-card border-primary/20" : "bg-secondary/20 border-border"}`}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2">
            {danceOff.type === "h2h" ? <Swords className="w-4 h-4 text-primary" /> : <Users className="w-4 h-4 text-blue-500" />}
            <span className="font-bold text-sm">{danceOff.type === "h2h" ? "Head-to-Head" : "Showdown"}</span>
            {danceOff.title && <span className="text-muted-foreground text-sm">· {danceOff.title}</span>}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{danceOff.durationHours}h challenge</p>
        </div>
        <div className="text-right">
          {danceOff.status === "active" ? (
            <div className="flex items-center gap-1 text-sm font-bold text-primary">
              <Clock className="w-3.5 h-3.5" />
              {msLeft > 0 ? formatMs(msLeft) : "Finalizing..."}
            </div>
          ) : (
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Final Results</span>
          )}
        </div>
      </div>

      {danceOff.joinCode && danceOff.status === "active" && (
        <button onClick={copyCode}
          className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-xl px-3 py-2 mb-3 text-sm w-full hover:bg-blue-100 transition-colors">
          <span className="font-mono font-bold text-blue-700 tracking-widest">{danceOff.joinCode}</span>
          <Copy className="w-3.5 h-3.5 text-blue-500 ml-auto" />
          <span className="text-xs text-blue-500">Tap to copy join code</span>
        </button>
      )}

      <div className="space-y-2">
        {sorted.map((p, idx) => {
          const count = danceOff.status === "completed" ? (p.finalDanceCount ?? 0) : (p.liveDanceCount ?? 0);
          const isMe = p.userId === currentUserId;
          return (
            <div key={p.userId} className={`flex items-center gap-3 rounded-xl px-3 py-2 ${isMe ? "bg-primary/5 border border-primary/20" : "bg-secondary/30"}`}>
              <RankBadge rank={idx + 1} />
              <div className="flex-1 min-w-0">
                <span className="font-semibold text-sm">{p.firstName}</span>
                {isMe && <span className="text-xs text-primary ml-1">(you)</span>}
                <span className="text-xs text-muted-foreground ml-1">@{p.username}</span>
              </div>
              <span className="font-bold text-base tabular-nums">{count}</span>
              <span className="text-xs text-muted-foreground">dances</span>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

function ChallengesTab({ buddyList, currentUserId }: { buddyList: (BuddyPublicStats & { songCount?: number })[]; currentUserId?: number }) {
  const { data: danceOffs = [], isLoading } = useDanceOffs();
  const createDanceOff = useCreateDanceOff();
  const joinDanceOff = useJoinDanceOff();
  const clearResults = useClearDanceOffResults();
  const deleteResult = useDeleteDanceOffResult();
  const { toast } = useToast();

  const [challengeType, setChallengeType] = useState<"h2h" | "showdown">("h2h");
  const [selectedBuddy, setSelectedBuddy] = useState<number | null>(null);
  const [durationHours, setDurationHours] = useState(1);
  const [challengeTitle, setChallengeTitle] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  const activeChallenges = danceOffs.filter(d => d.status === "active");
  const completedChallenges = danceOffs.filter(d => d.status === "completed");

  const handleCreate = async () => {
    if (challengeType === "h2h" && !selectedBuddy) {
      toast({ title: "Pick a buddy to challenge", variant: "destructive" }); return;
    }
    try {
      const result = await createDanceOff.mutateAsync({
        type: challengeType,
        title: challengeTitle,
        durationHours,
        challengedId: challengeType === "h2h" ? selectedBuddy ?? undefined : undefined,
      });
      toast({ title: challengeType === "showdown" ? `Showdown created! Code: ${result.joinCode}` : "Challenge sent!" });
      setShowCreate(false);
      setChallengeTitle("");
      setSelectedBuddy(null);
      setDurationHours(1);
    } catch (err: any) {
      toast({ title: err.message, variant: "destructive" });
    }
  };

  const handleJoin = async () => {
    if (!joinCode.trim()) return;
    try {
      await joinDanceOff.mutateAsync(joinCode.trim());
      toast({ title: "Joined the showdown!" });
      setJoinCode("");
    } catch (err: any) {
      toast({ title: err.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      {/* Join showdown */}
      <div className="bg-card rounded-2xl border border-border p-4">
        <p className="text-sm font-semibold mb-2 flex items-center gap-2"><Users className="w-4 h-4 text-blue-500" /> Join a Showdown</p>
        <div className="flex gap-2">
          <Input placeholder="Enter 6-digit code" className="rounded-xl uppercase tracking-widest font-mono"
            value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase().slice(0, 6))}
            onKeyDown={e => e.key === "Enter" && handleJoin()} maxLength={6} data-testid="input-join-code" />
          <Button onClick={handleJoin} disabled={joinCode.length < 6 || joinDanceOff.isPending} className="rounded-xl bg-blue-500 hover:bg-blue-600 text-white" data-testid="button-join-showdown">
            {joinDanceOff.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Join"}
          </Button>
        </div>
      </div>

      {/* Create challenge */}
      <div className="bg-card rounded-2xl border border-border p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold flex items-center gap-2"><Swords className="w-4 h-4 text-primary" /> Create a Challenge</p>
          <Button variant="ghost" size="sm" className="rounded-lg h-7 text-xs" onClick={() => setShowCreate(v => !v)}>
            {showCreate ? "Cancel" : "New Challenge"}
          </Button>
        </div>

        <AnimatePresence>
          {showCreate && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="space-y-3 overflow-hidden">
              {/* H2H vs Showdown */}
              <div className="flex rounded-xl overflow-hidden border border-border">
                <button type="button"
                  className={`flex-1 py-2 text-sm font-medium flex items-center justify-center gap-1.5 transition-colors ${challengeType === "h2h" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary"}`}
                  onClick={() => setChallengeType("h2h")}>
                  <Swords className="w-3.5 h-3.5" /> Head-to-Head
                </button>
                <button type="button"
                  className={`flex-1 py-2 text-sm font-medium flex items-center justify-center gap-1.5 transition-colors ${challengeType === "showdown" ? "bg-blue-500 text-white" : "text-muted-foreground hover:bg-secondary"}`}
                  onClick={() => setChallengeType("showdown")}>
                  <Users className="w-3.5 h-3.5" /> Showdown
                </button>
              </div>

              <Input placeholder="Challenge title (optional)" className="rounded-xl" value={challengeTitle}
                onChange={e => setChallengeTitle(e.target.value)} data-testid="input-challenge-title" />

              {challengeType === "h2h" && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground font-medium">Choose a buddy:</p>
                  {buddyList.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No buddies yet.</p>
                  ) : (
                    <div className="space-y-1.5 max-h-36 overflow-y-auto">
                      {buddyList.map(b => (
                        <button key={b.userId} type="button"
                          className={`w-full flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition-colors ${selectedBuddy === b.userId ? "bg-primary/10 border border-primary/30 font-semibold" : "bg-secondary/30 hover:bg-secondary/60"}`}
                          onClick={() => setSelectedBuddy(b.userId)} data-testid={`button-select-buddy-${b.userId}`}>
                          <AvatarCircle firstName={b.firstName} avatar={b.avatar} size="sm" />
                          <span>{b.firstName}</span>
                          <span className="text-muted-foreground text-xs">@{b.username}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {challengeType === "showdown" && (
                <p className="text-xs text-muted-foreground bg-blue-50 rounded-xl px-3 py-2">
                  A 6-digit code will be generated. Share it with friends to let them join!
                </p>
              )}

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-muted-foreground">Duration</p>
                  <span className="text-sm font-bold">{durationHours} hour{durationHours !== 1 ? "s" : ""}</span>
                </div>
                <Slider min={1} max={12} step={1} value={[durationHours]} onValueChange={([v]) => setDurationHours(v)}
                  className="w-full" data-testid="slider-duration" />
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>1h</span><span>6h</span><span>12h</span>
                </div>
              </div>

              <Button className="w-full rounded-xl gap-2" onClick={handleCreate} disabled={createDanceOff.isPending}
                data-testid="button-create-challenge">
                {createDanceOff.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                  challengeType === "h2h" ? <><Swords className="w-4 h-4" /> Send Challenge</> : <><Users className="w-4 h-4" /> Create Showdown</>
                )}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Active challenges */}
      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : activeChallenges.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-semibold text-foreground flex items-center gap-2"><Clock className="w-4 h-4 text-primary" /> Active</p>
          <AnimatePresence mode="popLayout">
            {activeChallenges.map(d => <DanceOffCard key={d.id} danceOff={d} currentUserId={currentUserId} />)}
          </AnimatePresence>
        </div>
      )}

      {/* Completed results */}
      {completedChallenges.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-semibold text-foreground flex items-center gap-2"><Trophy className="w-4 h-4 text-yellow-500" /> Results</p>
          <AnimatePresence mode="popLayout">
            {completedChallenges.map(d => (
              <SwipeableCard key={d.id} onDelete={async () => {
                try {
                  await deleteResult.mutateAsync(d.id);
                } catch {
                  toast({ title: "Could not delete challenge", variant: "destructive" });
                }
              }}>
                <DanceOffCard danceOff={d} currentUserId={currentUserId} />
              </SwipeableCard>
            ))}
          </AnimatePresence>
          <div className="flex justify-center pt-1">
            <button
              className="text-xs text-destructive underline underline-offset-2 hover:opacity-70 transition-opacity"
              onClick={async () => {
                try {
                  await clearResults.mutateAsync();
                  toast({ title: "Challenge results cleared" });
                } catch {
                  toast({ title: "Could not clear results", variant: "destructive" });
                }
              }}
              disabled={clearResults.isPending}
              data-testid="button-clear-challenge-results"
            >
              {clearResults.isPending ? "Clearing..." : "Clear Challenge Results"}
            </button>
          </div>
        </div>
      )}

      {!isLoading && activeChallenges.length === 0 && completedChallenges.length === 0 && (
        <div className="text-center py-12 bg-secondary/20 rounded-2xl border-2 border-dashed border-border">
          <Swords className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-40" />
          <p className="font-medium text-foreground">No challenges yet</p>
          <p className="text-sm text-muted-foreground mt-1">Challenge a buddy or start a group showdown!</p>
        </div>
      )}
    </div>
  );
}

export default function Buddies() {
  const { user } = useAuth();
  const { data: buddyList = [], isLoading: buddiesLoading } = useBuddies();
  const { data: pendingRequests = [] } = useBuddyRequests();
  const searchUsers = useSearchUsers();
  const sendRequest = useSendBuddyRequest();
  const respondRequest = useRespondToBuddyRequest();
  const removeBuddy = useRemoveBuddy();
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{ id: number; username: string; firstName: string; avatar?: string }[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    try {
      const results = await searchUsers.mutateAsync(searchQuery.trim());
      setSearchResults(results);
      setHasSearched(true);
    } catch {
      toast({ title: "Search failed", variant: "destructive" });
    }
  };

  const handleSendRequest = async (recipientId: number, name: string) => {
    try {
      await sendRequest.mutateAsync(recipientId);
      toast({ title: "Request sent!", description: `Buddy request sent to ${name}.` });
      setSearchResults(prev => prev.filter(u => u.id !== recipientId));
    } catch (err: any) {
      toast({ title: "Couldn't send request", description: err.message, variant: "destructive" });
    }
  };

  const handleRespond = async (id: number, action: "accept" | "decline", name: string) => {
    await respondRequest.mutateAsync({ id, action });
    if (action === "accept") toast({ title: "Buddy added!", description: `You and ${name} are now dancing buddies.` });
  };

  const handleRemove = async (buddyUserId: number) => {
    if (!confirm("Remove this buddy?")) return;
    await removeBuddy.mutateAsync(buddyUserId);
  };

  const rankedBuddies = [...buddyList].sort((a, b) => ((b as any).songCount ?? 0) - ((a as any).songCount ?? 0));
  const buddyUserIds = new Set(buddyList.map(b => b.userId));
  const pendingIds = new Set(pendingRequests.map(r => r.requesterId));

  return (
    <div className="container px-4 pb-24 pt-8 mx-auto max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-display font-bold text-foreground">Dancing Buddies</h1>
        <Button size="icon" variant="ghost" className="h-9 w-9 text-muted-foreground hover:text-primary rounded-xl"
          onClick={() => window.location.reload()} data-testid="button-refresh-buddies">
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {pendingRequests.length > 0 && (
        <div className="mb-6 bg-primary/5 border-2 border-primary/20 rounded-2xl p-4 space-y-3">
          <p className="font-semibold text-sm text-primary flex items-center gap-2">
            <UserCheck className="w-4 h-4" /> Pending Requests ({pendingRequests.length})
          </p>
          {pendingRequests.map(req => (
            <div key={req.id} className="flex items-center justify-between gap-3 bg-card rounded-xl px-4 py-3 border border-border" data-testid={`pending-request-${req.id}`}>
              <div className="flex items-center gap-3">
                <AvatarCircle firstName={req.requesterFirstName} avatar={req.requesterAvatar} size="sm" />
                <div>
                  <p className="font-medium text-sm">{req.requesterFirstName}</p>
                  <p className="text-xs text-muted-foreground">@{req.requesterUsername}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" className="rounded-lg h-8 bg-primary text-primary-foreground" onClick={() => handleRespond(req.id, "accept", req.requesterFirstName)} data-testid={`button-accept-${req.id}`}>
                  <UserCheck className="w-3.5 h-3.5 mr-1" /> Accept
                </Button>
                <Button size="sm" variant="ghost" className="rounded-lg h-8 text-muted-foreground hover:text-destructive" onClick={() => handleRespond(req.id, "decline", req.requesterFirstName)} data-testid={`button-decline-${req.id}`}>
                  <UserX className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Tabs defaultValue="buddies" className="space-y-4">
        <TabsList className="w-full bg-secondary/40 rounded-xl">
          <TabsTrigger value="buddies" className="flex-1 rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm">
            Buddies {buddyList.length > 0 && <span className="ml-1.5 text-xs bg-primary/15 text-primary rounded-full px-1.5">{buddyList.length}</span>}
          </TabsTrigger>
          <TabsTrigger value="challenges" className="flex-1 rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm">
            Challenges
          </TabsTrigger>
          <TabsTrigger value="find" className="flex-1 rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm">Find</TabsTrigger>
        </TabsList>

        <TabsContent value="buddies" className="space-y-3 mt-2">
          {buddiesLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
          ) : rankedBuddies.length === 0 ? (
            <div className="text-center py-16 bg-secondary/20 rounded-2xl border-2 border-dashed border-border">
              <UserPlus className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-40" />
              <p className="font-medium text-foreground">No buddies yet</p>
              <p className="text-sm text-muted-foreground mt-1">Go to Find to add dancing partners!</p>
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              {rankedBuddies.map((buddy, idx) => (
                <BuddyCard key={buddy.userId} buddy={buddy} rank={idx + 1} onRemove={handleRemove} />
              ))}
            </AnimatePresence>
          )}
        </TabsContent>

        <TabsContent value="challenges" className="mt-2">
          <ChallengesTab buddyList={rankedBuddies} currentUserId={user?.id} />
        </TabsContent>

        <TabsContent value="find" className="space-y-4 mt-2">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search by username..." className="pl-9 rounded-xl" value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); setHasSearched(false); }}
                onKeyDown={e => e.key === "Enter" && handleSearch()} data-testid="input-buddy-search" />
            </div>
            <Button onClick={handleSearch} disabled={searchUsers.isPending || !searchQuery.trim()} className="rounded-xl bg-primary text-primary-foreground" data-testid="button-buddy-search">
              {searchUsers.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            </Button>
          </div>

          <AnimatePresence mode="popLayout">
            {searchResults.map(u => {
              const alreadyBuddy = buddyUserIds.has(u.id);
              const pendingFromThem = pendingIds.has(u.id);
              return (
                <motion.div key={u.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
                  className="flex items-center justify-between bg-card rounded-xl border border-border px-4 py-3 shadow-sm" data-testid={`search-result-${u.id}`}>
                  <div className="flex items-center gap-3">
                    <AvatarCircle firstName={u.firstName} avatar={u.avatar} size="sm" />
                    <div>
                      <p className="font-medium text-sm">{u.firstName}</p>
                      <p className="text-xs text-muted-foreground">@{u.username}</p>
                    </div>
                  </div>
                  {alreadyBuddy ? (
                    <span className="text-xs text-muted-foreground flex items-center gap-1"><UserCheck className="w-3.5 h-3.5" /> Buddies</span>
                  ) : pendingFromThem ? (
                    <span className="text-xs text-muted-foreground">Incoming request</span>
                  ) : (
                    <Button size="sm" className="rounded-lg h-8 bg-primary text-primary-foreground gap-1"
                      onClick={() => handleSendRequest(u.id, u.firstName)} disabled={sendRequest.isPending} data-testid={`button-add-buddy-${u.id}`}>
                      <UserPlus className="w-3.5 h-3.5" /> Add
                    </Button>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
          {hasSearched && searchResults.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-6">No users found for "{searchQuery}"</p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
