import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FadeImg } from "@/components/FadeImg";
import { usePublicProfile, useSendBuddyRequest, type CrewRelationship } from "@/hooks/use-buddies";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, UserPlus, UserCheck, Clock } from "lucide-react";

interface UserProfileModalProps {
  userId: number | null;
  isOpen: boolean;
  onClose: () => void;
  onRequestSent?: () => void;
}

function StatChip({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl bg-secondary/40 px-3 py-2 text-center" data-testid={`stat-${label.toLowerCase().replace(/\s+/g, "-")}`}>
      <p className="text-lg font-bold font-display text-foreground truncate">{value}</p>
      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
    </div>
  );
}

export function UserProfileModal({ userId, isOpen, onClose, onRequestSent }: UserProfileModalProps) {
  const { data: profile, isLoading, isError } = usePublicProfile(isOpen ? userId : null);
  const sendRequest = useSendBuddyRequest();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [localRelationship, setLocalRelationship] = useState<CrewRelationship | null>(null);

  useEffect(() => {
    setLocalRelationship(null);
  }, [userId, isOpen]);

  const relationship = localRelationship ?? profile?.relationship;

  const handleSendRequest = async () => {
    if (!profile) return;
    try {
      await sendRequest.mutateAsync(profile.userId);
      setLocalRelationship("requestPending");
      queryClient.invalidateQueries({ queryKey: ["/api/users", profile.userId, "profile"] });
      toast({ title: "Crew request sent!", description: `Request sent to ${profile.firstName}.` });
      onRequestSent?.();
    } catch (err: any) {
      toast({ title: "Couldn't send request", description: err.message, variant: "destructive" });
    }
  };

  const hasStats = profile
    ? profile.stats.totalDances > 0 ||
      profile.stats.lineDanceCount > 0 ||
      profile.stats.swingDanceCount > 0 ||
      profile.stats.longestStreak > 0 ||
      profile.stats.currentStreak > 0 ||
      (profile.stats.favoriteDance && profile.stats.favoriteDance !== "N/A") ||
      (profile.stats.topLocation && profile.stats.topLocation !== "N/A")
    : false;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-sm w-full bg-card rounded-2xl" data-testid="modal-user-profile">
        <DialogHeader className="sr-only">
          <DialogTitle>{profile ? `${profile.firstName}'s profile` : "User profile"}</DialogTitle>
          <DialogDescription>Public dance profile</DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-12" data-testid="status-profile-loading">
            <Loader2 className="w-7 h-7 animate-spin text-muted-foreground" />
          </div>
        ) : isError || !profile ? (
          <div className="text-center py-12" data-testid="status-profile-error">
            <p className="text-sm text-muted-foreground">Unable to load profile</p>
          </div>
        ) : (
          <div className="flex flex-col items-center pt-2">
            {/* Avatar */}
            <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center overflow-hidden border-2 border-border mb-3">
              {profile.avatar ? (
                <FadeImg src={profile.avatar} alt="" className="w-full h-full object-cover" data-testid="img-profile-avatar" />
              ) : (
                <span className="font-display font-bold text-primary text-3xl">
                  {`${profile.firstName.charAt(0)}${profile.lastName.charAt(0)}`.toUpperCase() || "?"}
                </span>
              )}
            </div>

            {/* Name */}
            <h2 className="font-display text-2xl font-bold text-foreground text-center" data-testid="text-profile-name">
              {`${profile.firstName} ${profile.lastName}`.trim()}
            </h2>
            <p className="text-sm text-muted-foreground text-center mb-4" data-testid="text-profile-handle">
              {profile.username ? `@${profile.username}` : "@dancer"}
              {profile.location ? ` · ${profile.location}` : ""}
            </p>

            {/* Stats box */}
            <div className="w-full bg-primary/5 border border-primary/15 rounded-2xl p-3 mb-4">
              <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-2 text-center">Dance Stats</p>
              {hasStats ? (
                <div className="grid grid-cols-2 gap-2" data-testid="grid-profile-stats">
                  <StatChip label="Total Dances" value={profile.stats.totalDances} />
                  <StatChip label="Line Dances" value={profile.stats.lineDanceCount} />
                  <StatChip label="Swing Dances" value={profile.stats.swingDanceCount} />
                  <StatChip label="Longest Streak" value={`${profile.stats.longestStreak}d`} />
                  {profile.stats.favoriteDance && profile.stats.favoriteDance !== "N/A" && (
                    <StatChip label="Most Danced" value={profile.stats.favoriteDance} />
                  )}
                  {profile.stats.topLocation && profile.stats.topLocation !== "N/A" && (
                    <StatChip label="Top Spot" value={profile.stats.topLocation} />
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-2" data-testid="text-no-stats">No dance stats yet</p>
              )}
            </div>

            {/* Relationship button */}
            {relationship === "self" ? null : relationship === "alreadyCrew" ? (
              <Button disabled variant="secondary" className="w-full rounded-xl gap-2" data-testid="button-crew-status">
                <UserCheck className="w-4 h-4" /> Already In Your Crew
              </Button>
            ) : relationship === "requestPending" ? (
              <Button disabled variant="secondary" className="w-full rounded-xl gap-2" data-testid="button-crew-status">
                <Clock className="w-4 h-4" /> Crew Request Sent
              </Button>
            ) : (
              <Button
                className="w-full rounded-xl gap-2 bg-primary text-primary-foreground"
                onClick={handleSendRequest}
                disabled={sendRequest.isPending}
                data-testid="button-send-crew-request"
              >
                {sendRequest.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                Send Crew Request
              </Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
