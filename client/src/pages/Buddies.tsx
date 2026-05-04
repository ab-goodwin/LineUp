import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  useBuddies, useBuddyRequests, useSearchUsers,
  useSendBuddyRequest, useRespondToBuddyRequest,
  useRemoveBuddy, useChallenges, useSendChallenge,
  type BuddyPublicStats, type Challenge,
} from "@/hooks/use-buddies";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/components/ui/tabs";
import { Loader2, Search, UserPlus, UserCheck, UserX, Flame, Trophy, Swords, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow } from "date-fns";

function BuddyCard({ buddy, onChallenge, onRemove }: {
  buddy: BuddyPublicStats;
  onChallenge: (buddy: BuddyPublicStats) => void;
  onRemove: (userId: number) => void;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="bg-card rounded-2xl border border-border p-4 shadow-sm"
      data-testid={`buddy-card-${buddy.userId}`}
    >
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
            <span className="font-display font-bold text-primary text-lg">
              {buddy.firstName.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <p className="font-bold text-base">{buddy.firstName}</p>
            <p className="text-xs text-muted-foreground">@{buddy.username}</p>
          </div>
        </div>
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8 text-muted-foreground hover:text-destructive"
          onClick={() => onRemove(buddy.userId)}
          data-testid={`button-remove-buddy-${buddy.userId}`}
        >
          <X className="w-3.5 h-3.5" />
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-4">
        <StatPill label="Dances" value={buddy.totalDances} />
        <StatPill label="Best Streak" value={`${buddy.longestStreak}d`} highlight />
        <StatPill label="Days Active" value={buddy.totalDaysDancing} />
      </div>

      {buddy.currentStreak > 0 && (
        <div className="flex items-center gap-1.5 text-sm text-orange-500 font-medium mb-3">
          <Flame className="w-4 h-4" />
          <span>{buddy.currentStreak}-day streak going!</span>
        </div>
      )}

      {buddy.favoriteDance !== "N/A" && (
        <p className="text-xs text-muted-foreground mb-3">
          Favorite: <span className="font-medium text-foreground">{buddy.favoriteDance}</span>
        </p>
      )}

      <Button
        size="sm"
        variant="outline"
        className="w-full rounded-xl border-2 gap-2 font-medium"
        onClick={() => onChallenge(buddy)}
        data-testid={`button-challenge-${buddy.userId}`}
      >
        <Swords className="w-3.5 h-3.5" />
        Challenge to Streak
      </Button>
    </motion.div>
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

function ChallengeCard({ challenge, currentUserId }: { challenge: Challenge; currentUserId: number }) {
  const isChallenger = challenge.challengerId === currentUserId;
  const myStreak = isChallenger ? challenge.challengerStreak : challenge.challengedStreak;
  const theirStreak = isChallenger ? challenge.challengedStreak : challenge.challengerStreak;
  const theirName = isChallenger ? challenge.challengedFirstName : challenge.challengerFirstName;
  const theirUsername = isChallenger ? challenge.challengedUsername : challenge.challengerUsername;
  const winning = myStreak >= theirStreak;
  const endDate = new Date(challenge.startDate);
  endDate.setDate(endDate.getDate() + challenge.durationDays);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-2xl border border-border p-4 shadow-sm"
      data-testid={`challenge-card-${challenge.id}`}
    >
      <div className="flex items-center gap-2 mb-3">
        <Swords className="w-4 h-4 text-primary" />
        <p className="font-bold text-sm">
          {isChallenger ? `You challenged @${theirUsername}` : `@${challenge.challengerUsername} challenged you`}
        </p>
        {winning && <Trophy className="w-4 h-4 text-yellow-500 ml-auto" />}
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="bg-primary/10 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold font-display text-primary">{myStreak}</p>
          <p className="text-xs text-muted-foreground">Your streak</p>
        </div>
        <div className="bg-secondary/40 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold font-display">{theirStreak}</p>
          <p className="text-xs text-muted-foreground">{theirName}'s streak</p>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{challenge.durationDays}-day challenge</span>
        <span>Ends {formatDistanceToNow(endDate, { addSuffix: true })}</span>
      </div>
    </motion.div>
  );
}

function ChallengeDialog({ buddy, open, onOpenChange }: {
  buddy: BuddyPublicStats | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const sendChallenge = useSendChallenge();
  const { toast } = useToast();
  const [duration, setDuration] = useState("7");

  const handleSend = async () => {
    if (!buddy) return;
    try {
      await sendChallenge.mutateAsync({ challengedId: buddy.userId, durationDays: Number(duration) });
      toast({ title: "Challenge sent!", description: `You challenged ${buddy.firstName} to a ${duration}-day streak battle.` });
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl bg-card max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-display text-xl text-primary flex items-center gap-2">
            <Swords className="w-5 h-5" />
            Challenge {buddy?.firstName}
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Who can keep their dancing streak alive longest? The challenge tracks your active streak starting today.
        </p>
        <div className="space-y-3">
          <label className="text-sm font-medium">Duration</label>
          <Select value={duration} onValueChange={setDuration}>
            <SelectTrigger className="rounded-xl" data-testid="select-challenge-duration">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3">3 days</SelectItem>
              <SelectItem value="7">7 days</SelectItem>
              <SelectItem value="14">14 days</SelectItem>
              <SelectItem value="30">30 days</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button
          className="w-full rounded-xl bg-primary hover:bg-primary/90 font-semibold"
          onClick={handleSend}
          disabled={sendChallenge.isPending}
          data-testid="button-send-challenge"
        >
          {sendChallenge.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Send Challenge 🤠"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}

export default function Buddies() {
  const { user } = useAuth();
  const { data: buddyList = [], isLoading: buddiesLoading } = useBuddies();
  const { data: pendingRequests = [] } = useBuddyRequests();
  const { data: challenges = [] } = useChallenges();
  const searchUsers = useSearchUsers();
  const sendRequest = useSendBuddyRequest();
  const respondRequest = useRespondToBuddyRequest();
  const removeBuddy = useRemoveBuddy();
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{ id: number; username: string; firstName: string }[]>([]);
  const [challengeTarget, setChallengeTarget] = useState<BuddyPublicStats | null>(null);
  const [isChallengeOpen, setIsChallengeOpen] = useState(false);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    try {
      const results = await searchUsers.mutateAsync(searchQuery.trim());
      setSearchResults(results);
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
    if (action === "accept") {
      toast({ title: "Buddy added!", description: `You and ${name} are now dancing buddies.` });
    }
  };

  const handleRemove = async (buddyUserId: number) => {
    if (!confirm("Remove this buddy?")) return;
    await removeBuddy.mutateAsync(buddyUserId);
  };

  const handleChallenge = (buddy: BuddyPublicStats) => {
    setChallengeTarget(buddy);
    setIsChallengeOpen(true);
  };

  const buddyUserIds = new Set(buddyList.map(b => b.userId));
  const pendingIds = new Set(pendingRequests.map(r => r.requesterId));

  return (
    <div className="container px-4 pb-24 pt-8 mx-auto max-w-2xl">
      <h1 className="text-3xl font-display font-bold mb-6">Dancing Buddies</h1>

      {pendingRequests.length > 0 && (
        <div className="mb-6 bg-primary/5 border-2 border-primary/20 rounded-2xl p-4 space-y-3">
          <p className="font-semibold text-sm text-primary flex items-center gap-2">
            <UserCheck className="w-4 h-4" />
            Pending Requests ({pendingRequests.length})
          </p>
          {pendingRequests.map(req => (
            <div key={req.id} className="flex items-center justify-between gap-3 bg-card rounded-xl px-4 py-3 border border-border" data-testid={`pending-request-${req.id}`}>
              <div>
                <p className="font-medium text-sm">{req.requesterFirstName}</p>
                <p className="text-xs text-muted-foreground">@{req.requesterUsername}</p>
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
            Challenges {challenges.length > 0 && <span className="ml-1.5 text-xs bg-primary/15 text-primary rounded-full px-1.5">{challenges.length}</span>}
          </TabsTrigger>
          <TabsTrigger value="find" className="flex-1 rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm">
            Find
          </TabsTrigger>
        </TabsList>

        <TabsContent value="buddies" className="space-y-3 mt-2">
          {buddiesLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
          ) : buddyList.length === 0 ? (
            <div className="text-center py-16 bg-secondary/20 rounded-2xl border-2 border-dashed border-border">
              <UserPlus className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-40" />
              <p className="font-medium">No buddies yet</p>
              <p className="text-sm text-muted-foreground">Go to the Find tab to add dancing partners!</p>
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              {buddyList.map(buddy => (
                <BuddyCard key={buddy.userId} buddy={buddy} onChallenge={handleChallenge} onRemove={handleRemove} />
              ))}
            </AnimatePresence>
          )}
        </TabsContent>

        <TabsContent value="challenges" className="space-y-3 mt-2">
          {challenges.length === 0 ? (
            <div className="text-center py-16 bg-secondary/20 rounded-2xl border-2 border-dashed border-border">
              <Swords className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-40" />
              <p className="font-medium">No active challenges</p>
              <p className="text-sm text-muted-foreground">Challenge a buddy to a streak battle from the Buddies tab!</p>
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              {challenges.map(c => (
                <ChallengeCard key={c.id} challenge={c} currentUserId={user!.id} />
              ))}
            </AnimatePresence>
          )}
        </TabsContent>

        <TabsContent value="find" className="space-y-4 mt-2">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by username..."
                className="pl-9 rounded-xl"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSearch()}
                data-testid="input-buddy-search"
              />
            </div>
            <Button
              onClick={handleSearch}
              disabled={searchUsers.isPending || !searchQuery.trim()}
              className="rounded-xl bg-primary text-primary-foreground"
              data-testid="button-buddy-search"
            >
              {searchUsers.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            </Button>
          </div>

          <AnimatePresence mode="popLayout">
            {searchResults.map(u => {
              const alreadyBuddy = buddyUserIds.has(u.id);
              const pendingFromThem = pendingIds.has(u.id);
              return (
                <motion.div
                  key={u.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="flex items-center justify-between bg-card rounded-xl border border-border px-4 py-3 shadow-sm"
                  data-testid={`search-result-${u.id}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center">
                      <span className="font-display font-bold text-primary">{u.firstName.charAt(0).toUpperCase()}</span>
                    </div>
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
                    <Button
                      size="sm"
                      className="rounded-lg h-8 bg-primary text-primary-foreground gap-1"
                      onClick={() => handleSendRequest(u.id, u.firstName)}
                      disabled={sendRequest.isPending}
                      data-testid={`button-add-buddy-${u.id}`}
                    >
                      <UserPlus className="w-3.5 h-3.5" /> Add
                    </Button>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>

          {searchUsers.isSuccess && searchResults.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-6">No users found for "{searchQuery}"</p>
          )}
        </TabsContent>
      </Tabs>

      <ChallengeDialog buddy={challengeTarget} open={isChallengeOpen} onOpenChange={setIsChallengeOpen} />
    </div>
  );
}
