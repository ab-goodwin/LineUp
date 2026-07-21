import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SpotifySearch } from "@/components/SpotifySearch";
import { RatingStars } from "@/components/RatingStars";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { STYLE_INFO, STYLE_OPTIONS, type StyleOption, type Song } from "@shared/schema";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";

interface LibraryItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialMode?: "line" | "swing";
  initialDanceName?: string;
  initialSongName?: string;
  initialArtist?: string;
  initialSpotifyQuery?: string;
  onCreated?: (song: Song) => void;
  onUseExisting?: (song: Song) => void;
}

interface DuplicateAlert {
  duplicate: Song;
}

const SWING_STYLES = STYLE_OPTIONS.filter(s => s !== "LINE");

export function LibraryItemDialog({
  open,
  onOpenChange,
  initialMode = "line",
  initialDanceName,
  initialSongName,
  initialArtist,
  initialSpotifyQuery,
  onCreated,
  onUseExisting,
}: LibraryItemDialogProps) {
  const queryClient = useQueryClient();

  const [mode, setMode] = useState<"line" | "swing">(initialMode);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duplicateAlert, setDuplicateAlert] = useState<DuplicateAlert | null>(null);
  const [pendingPayload, setPendingPayload] = useState<Record<string, unknown> | null>(null);

  const [songName, setSongName] = useState(initialSongName ?? "");
  const [artist, setArtist] = useState(initialArtist ?? "");
  const [rating, setRating] = useState(0);
  const [danceName, setDanceName] = useState(initialDanceName ?? "");
  const [swingStyle, setSwingStyle] = useState<StyleOption>("WCS");
  const [styleCustom, setStyleCustom] = useState("");

  // Reset state every time the dialog opens so each launch honours the current props
  useEffect(() => {
    if (open) {
      setMode(initialMode);
      setSongName(initialSongName ?? "");
      setArtist(initialArtist ?? "");
      setDanceName(initialDanceName ?? "");
      setRating(0);
      setSwingStyle("WCS");
      setStyleCustom("");
      setError(null);
      setDuplicateAlert(null);
      setPendingPayload(null);
    }
  }, [open]);

  const validate = () => {
    if (mode === "line") {
      if (!danceName.trim() && !songName.trim()) return "Enter a dance name or song name.";
    } else {
      if (!songName.trim()) return "Song name is required.";
      if (swingStyle === "OTHER" && !styleCustom.trim()) return "Custom style name is required.";
    }
    return null;
  };

  const buildPayload = () => {
    if (mode === "line") {
      return {
        danceName: danceName.trim() || songName.trim() || "Unknown Song",
        songName: songName.trim() || "Unknown Song",
        artist: artist.trim(),
        rating,
        style: "LINE" as StyleOption,
      };
    }
    return {
      danceName: songName.trim() || "Unknown Song",
      songName: songName.trim() || "Unknown Song",
      artist: artist.trim(),
      rating,
      style: swingStyle,
      styleCustom: swingStyle === "OTHER" ? styleCustom.trim() || null : null,
    };
  };

  const doSubmit = async (payload: Record<string, unknown>, confirmCreate: boolean) => {
    setIsPending(true);
    try {
      const res = await fetch("/api/songs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, confirmCreate }),
        credentials: "include",
      });

      if (res.status === 409) {
        const data = await res.json();
        setPendingPayload(payload);
        setDuplicateAlert({ duplicate: data.duplicate });
        return;
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.message || "Failed to add song");
        return;
      }

      const song: Song = await res.json();
      queryClient.invalidateQueries({ queryKey: [api.songs.list.path] });
      onCreated?.(song);
      onOpenChange(false);
    } finally {
      setIsPending(false);
    }
  };

  const handleSubmit = async () => {
    const err = validate();
    if (err) { setError(err); return; }
    setError(null);
    await doSubmit(buildPayload(), false);
  };

  const handleAddAnyway = async () => {
    if (!pendingPayload) return;
    setDuplicateAlert(null);
    await doSubmit(pendingPayload, true);
  };

  const handleUseExisting = () => {
    if (!duplicateAlert) return;
    onUseExisting?.(duplicateAlert.duplicate);
    setDuplicateAlert(null);
    onOpenChange(false);
  };

  const handleClose = () => {
    setError(null);
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open && !duplicateAlert} onOpenChange={o => !o && handleClose()}>
        <DialogContent className="rounded-2xl bg-card max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display text-xl text-primary">Add to Library</DialogTitle>
          </DialogHeader>

          <div className="flex rounded-lg overflow-hidden border border-border text-sm">
            <button
              type="button"
              className={`flex-1 py-2 font-medium transition-colors ${mode === "line" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-secondary"}`}
              onClick={() => setMode("line")}
            >Line Dance</button>
            <button
              type="button"
              className={`flex-1 py-2 font-medium transition-colors ${mode === "swing" ? "bg-blue-500 text-white" : "bg-background text-muted-foreground hover:bg-secondary"}`}
              onClick={() => setMode("swing")}
            >Swing</button>
          </div>

          <div className="space-y-3">
            <SpotifySearch
              placeholder="Search Spotify..."
              initialQuery={initialSpotifyQuery}
              onSelect={t => {
                setSongName(t.name);
                setArtist(t.artist);
                if (mode === "line" && !danceName) setDanceName(t.name);
              }}
            />

            {mode === "line" && (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Dance Name <span className="italic">(defaults to song name if blank)</span></Label>
                <Input
                  placeholder="e.g. Tush Push"
                  className="rounded-xl"
                  value={danceName}
                  onChange={e => setDanceName(e.target.value)}
                  data-testid="input-lib-dance-name"
                />
              </div>
            )}

            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">
                Song Name{mode === "swing" && <span className="text-destructive"> *</span>}
              </Label>
              <Input
                placeholder="Song title"
                className="rounded-xl"
                value={songName}
                onChange={e => setSongName(e.target.value)}
                data-testid="input-lib-song-name"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Artist <span className="italic">(optional)</span></Label>
              <Input
                placeholder="Artist name"
                className="rounded-xl"
                value={artist}
                onChange={e => setArtist(e.target.value)}
                data-testid="input-lib-artist"
              />
            </div>

            {mode === "swing" && (
              <>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Style <span className="text-destructive">*</span></Label>
                  <Select value={swingStyle} onValueChange={v => setSwingStyle(v as StyleOption)}>
                    <SelectTrigger className="rounded-xl" data-testid="select-lib-style">
                      <SelectValue placeholder="Choose style" />
                    </SelectTrigger>
                    <SelectContent>
                      {SWING_STYLES.map(s => (
                        <SelectItem key={s} value={s}>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold" style={{ color: STYLE_INFO[s].color }}>{STYLE_INFO[s].short}</span>
                            {STYLE_INFO[s].label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {swingStyle === "OTHER" && (
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Custom Style <span className="text-destructive">*</span></Label>
                    <Input
                      placeholder="e.g. Polka"
                      className="rounded-xl"
                      value={styleCustom}
                      onChange={e => setStyleCustom(e.target.value)}
                      data-testid="input-lib-style-custom"
                    />
                  </div>
                )}
              </>
            )}

            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Rating</Label>
              <RatingStars rating={rating} onRate={setRating} className="w-5 h-5" />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button
              className="w-full rounded-xl"
              onClick={handleSubmit}
              disabled={isPending}
              data-testid="button-lib-add"
            >
              {isPending ? "Adding…" : "Add to Library"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!duplicateAlert} onOpenChange={o => !o && setDuplicateAlert(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Already in Your Library</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
                <p>
                  <strong>{duplicateAlert?.duplicate.danceName}</strong>
                  {duplicateAlert?.duplicate.songName && duplicateAlert.duplicate.songName !== duplicateAlert.duplicate.danceName && ` — ${duplicateAlert.duplicate.songName}`}
                  {duplicateAlert?.duplicate.artist && ` by ${duplicateAlert.duplicate.artist}`}
                  {" "}is already in your library.
                </p>
                <p className="mt-1">What would you like to do?</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel className="rounded-xl" onClick={() => setDuplicateAlert(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction className="rounded-xl" onClick={handleUseExisting}>
              Use Existing
            </AlertDialogAction>
            <AlertDialogAction className="rounded-xl bg-secondary text-foreground hover:bg-secondary/80 border border-border" onClick={handleAddAnyway}>
              Add Anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
