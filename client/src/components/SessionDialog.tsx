import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LocationCombobox } from "@/components/LocationCombobox";
import { SpotifySearch } from "@/components/SpotifySearch";
import { insertSessionSchema, STYLE_INFO, STYLE_OPTIONS, type StyleOption, type Song } from "@shared/schema";
import { useCreateSession, useUpdateSession, useDeleteSession } from "@/hooks/use-sessions";
import { useSongs } from "@/hooks/use-songs";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Trash2, Search, Minus, Plus, CirclePlus } from "lucide-react";
import { StyleTag } from "@/lib/style-tags";

const formSchema = insertSessionSchema;
type FormValues = z.infer<typeof formSchema>;

const SWING_STYLES = STYLE_OPTIONS.filter(s => s !== "LINE");

interface SessionDialogProps {
  date: Date;
  existingSession?: any;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SessionDialog({ date, existingSession, isOpen, onOpenChange }: SessionDialogProps) {
  const { data: songs = [] } = useSongs();
  const queryClient = useQueryClient();
  const createSession = useCreateSession();
  const updateSession = useUpdateSession();
  const deleteSession = useDeleteSession();

  const [libTab, setLibTab] = useState<"line" | "swing" | "all">("line");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLocationId, setSelectedLocationId] = useState<number | null>(null);
  const [quantities, setQuantities] = useState<Map<number, number>>(new Map());

  // Inline add-song form
  const [addFormOpen, setAddFormOpen] = useState(false);
  const [addMode, setAddMode] = useState<"line" | "swing">("line");
  const [addDanceName, setAddDanceName] = useState("");
  const [addSongName, setAddSongName] = useState("");
  const [addArtist, setAddArtist] = useState("");
  const [addSwingStyle, setAddSwingStyle] = useState<StyleOption>("WCS");
  const [addStyleCustom, setAddStyleCustom] = useState("");
  const [addError, setAddError] = useState<string | null>(null);
  const [addDuplicate, setAddDuplicate] = useState<Song | null>(null);
  const [addPendingPayload, setAddPendingPayload] = useState<Record<string, unknown> | null>(null);
  const [addPending, setAddPending] = useState(false);
  const [spotifyInitialQuery, setSpotifyInitialQuery] = useState("");
  const [spotifyResetKey, setSpotifyResetKey] = useState(0);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { location: "", locationId: null, date },
  });

  // Sync addMode to libTab when tab changes
  useEffect(() => {
    if (libTab === "swing") setAddMode("swing");
    else if (libTab === "line") setAddMode("line");
  }, [libTab]);

  useEffect(() => {
    if (!isOpen) return;
    setSearchQuery("");
    setLibTab("line");
    setAddFormOpen(false);
    resetAddForm();
    if (existingSession) {
      form.reset({
        location: existingSession.location,
        locationId: existingSession.locationId ?? null,
        date: new Date(existingSession.date),
      });
      setSelectedLocationId(existingSession.locationId ?? null);
      const qMap = new Map<number, number>();
      for (const d of existingSession.dances) {
        qMap.set(d.id, (d as any).quantity ?? 1);
      }
      setQuantities(qMap);
    } else {
      form.reset({ location: "", locationId: null, date });
      setSelectedLocationId(null);
      setQuantities(new Map());
    }
  }, [existingSession, date, isOpen]);

  const resetAddForm = () => {
    setAddDanceName(""); setAddSongName(""); setAddArtist("");
    setAddSwingStyle("WCS"); setAddStyleCustom("");
    setAddError(null); setAddDuplicate(null); setAddPendingPayload(null);
    setSpotifyInitialQuery(""); setSpotifyResetKey(k => k + 1);
  };

  const setQty = (songId: number, delta: number) => {
    setQuantities(prev => {
      const next = new Map(prev);
      const newVal = Math.max(0, (next.get(songId) ?? 0) + delta);
      if (newVal === 0) next.delete(songId); else next.set(songId, newVal);
      return next;
    });
  };

  const toggleSong = (songId: number) => {
    setQuantities(prev => {
      const next = new Map(prev);
      if (next.has(songId)) next.delete(songId); else next.set(songId, 1);
      return next;
    });
  };

  const filteredSongs = songs
    .filter(s => {
      const isLine = (s as any).style === "LINE";
      if (libTab === "line" && !isLine) return false;
      if (libTab === "swing" && isLine) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        s.danceName.toLowerCase().includes(q) ||
        s.songName.toLowerCase().includes(q) ||
        (s.artist && s.artist.toLowerCase().includes(q))
      );
    })
    .sort((a, b) => {
      const aOn = quantities.has(a.id) ? 1 : 0;
      const bOn = quantities.has(b.id) ? 1 : 0;
      if (aOn !== bOn) return bOn - aOn;
      return a.danceName.localeCompare(b.danceName);
    });

  const totalDances = Array.from(quantities.values()).reduce((s, q) => s + q, 0);
  const uniqueDances = quantities.size;

  const doAddSong = async (payload: Record<string, unknown>, confirmCreate: boolean) => {
    setAddPending(true);
    try {
      const res = await fetch("/api/songs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ...payload, ...(confirmCreate ? { confirmCreate: true } : {}) }),
      });
      if (res.status === 409) {
        const data = await res.json();
        setAddDuplicate(data.duplicate);
        setAddPendingPayload(payload);
        setAddPending(false);
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setAddError(data.message || "Failed to add song.");
        setAddPending(false);
        return;
      }
      const newSong: Song = await res.json();
      queryClient.invalidateQueries({ queryKey: ["/api/songs"] });
      setQuantities(prev => {
        const next = new Map(prev);
        next.set(newSong.id, (next.get(newSong.id) ?? 0) + 1);
        return next;
      });
      resetAddForm();
      setAddFormOpen(false);
    } catch {
      setAddError("Failed to add song.");
    }
    setAddPending(false);
  };

  const handleAddSubmit = () => {
    if (addMode === "line" && !addDanceName.trim() && !addSongName.trim()) {
      setAddError("Enter a dance name or song name."); return;
    }
    if (addMode === "swing" && !addSongName.trim()) {
      setAddError("Song name is required."); return;
    }
    if (addMode === "swing" && addSwingStyle === "OTHER" && !addStyleCustom.trim()) {
      setAddError("Custom style name is required."); return;
    }
    const payload: Record<string, unknown> = addMode === "line"
      ? {
          danceName: addDanceName.trim() || addSongName.trim(),
          songName: addSongName.trim() || addDanceName.trim(),
          artist: addArtist.trim(),
          style: "LINE",
          rating: 0,
        }
      : {
          danceName: addSongName.trim(),
          songName: addSongName.trim(),
          artist: addArtist.trim(),
          style: addSwingStyle,
          styleCustom: addSwingStyle === "OTHER" ? addStyleCustom.trim() : "",
          rating: 0,
        };
    setAddError(null);
    setAddDuplicate(null);
    doAddSong(payload, false);
  };

  const handleUseExisting = (song: Song) => {
    setQuantities(prev => {
      const next = new Map(prev);
      next.set(song.id, (next.get(song.id) ?? 0) + 1);
      return next;
    });
    resetAddForm();
    setAddFormOpen(false);
  };

  const onSubmit = async (values: FormValues) => {
    try {
      const dances = Array.from(quantities.entries())
        .filter(([, qty]) => qty > 0)
        .map(([songId, quantity]) => ({ songId, quantity }));
      const payload = { ...values, locationId: selectedLocationId, dances };
      if (existingSession) {
        await updateSession.mutateAsync({ id: existingSession.id, ...payload });
      } else {
        await createSession.mutateAsync(payload);
      }
      onOpenChange(false);
    } catch (e) { console.error(e); }
  };

  const handleDelete = async () => {
    if (!existingSession || !confirm("Delete this session?")) return;
    await deleteSession.mutateAsync(existingSession.id);
    onOpenChange(false);
  };

  const isSubmitting = createSession.isPending || updateSession.isPending;

  // Color theming based on active tab (or add form mode)
  const isSwing = libTab === "swing";
  const accentColor = isSwing ? "#3B82F6" : "#D85C31";
  const accentBorder = isSwing ? "border-blue-400" : "border-primary/60";
  const accentBg = isSwing ? "bg-blue-50 dark:bg-blue-950/20" : "bg-primary/5";

  const tabPill = (tab: "line" | "swing" | "all", label: string) => {
    const active = libTab === tab;
    const color = tab === "swing" ? "#3B82F6" : "#D85C31";
    return (
      <button
        key={tab}
        type="button"
        onClick={() => setLibTab(tab)}
        className={`px-3 py-0.5 rounded-full text-xs font-semibold border transition-colors ${
          active
            ? "text-white border-transparent"
            : "bg-transparent text-foreground border-border hover:border-foreground/40"
        }`}
        style={active ? { background: tab === "all" ? "#D85C31" : color, borderColor: "transparent" } : {}}
        data-testid={`tab-${tab}`}
      >
        {label}
      </button>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[420px] w-full bg-card rounded-2xl sm:rounded-2xl max-h-[92vh] flex flex-col gap-0 p-0 overflow-hidden">
        {/* Header */}
        <div className="px-4 pt-4 pb-2 text-center">
          <h2 className="font-display text-2xl text-primary leading-tight">
            {existingSession ? "Edit Session" : "New Session"}
          </h2>
          <p className="text-muted-foreground text-sm mt-0.5">{format(date, "MMMM do, yyyy")}</p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0 overflow-hidden">
            <div className="px-5 pt-1 space-y-2">
              {/* Search bar */}
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search Your Library..."
                  className="h-9 pl-8 rounded-xl border-border/60 bg-background text-sm"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  data-testid="input-song-search"
                />
              </div>

              {/* Circle-plus + Location row */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => { setAddFormOpen(v => !v); resetAddForm(); }}
                  className="flex-shrink-0 p-0.5 rounded-full hover:opacity-80 transition-opacity"
                  title={addFormOpen ? "Close" : "Add song to library"}
                  data-testid="button-toggle-add-form"
                >
                  <CirclePlus className="w-6 h-6" style={{ color: accentColor }} />
                </button>
                <div className="flex-1">
                  <FormField control={form.control} name="location" render={({ field }) => (
                    <FormItem className="mb-0">
                      <FormControl>
                        <LocationCombobox
                          value={field.value}
                          onChange={v => { field.onChange(v); form.setValue("locationId", null); setSelectedLocationId(null); }}
                          onSelectLocationId={id => { form.setValue("locationId", id); setSelectedLocationId(id); }}
                          placeholder="Select or type a location..."
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              </div>

              {/* Inline add-song form */}
              {addFormOpen && (
                <div className={`border-2 rounded-xl p-3 space-y-2 ${accentBorder} ${accentBg}`}>
                  {/* Line / Swing toggle inside form */}
                  <div className="flex gap-1 p-0.5 bg-secondary/60 rounded-lg text-xs">
                    <button
                      type="button"
                      onClick={() => { setAddMode("line"); setAddError(null); setAddDuplicate(null); }}
                      className={`flex-1 py-1 rounded-md font-semibold transition-colors ${addMode === "line" ? "bg-background shadow text-primary" : "text-muted-foreground"}`}
                      data-testid="add-mode-line"
                    >Line Dance</button>
                    <button
                      type="button"
                      onClick={() => { setAddMode("swing"); setAddError(null); setAddDuplicate(null); }}
                      className={`flex-1 py-1 rounded-md font-semibold transition-colors ${addMode === "swing" ? "bg-background shadow text-blue-600 dark:text-blue-400" : "text-muted-foreground"}`}
                      data-testid="add-mode-swing"
                    >Swing</button>
                  </div>

                  {/* Spotify search */}
                  <SpotifySearch
                    key={spotifyResetKey}
                    placeholder="Search Spotify..."
                    initialQuery={spotifyInitialQuery}
                    onSelect={t => {
                      setAddSongName(t.name);
                      setAddArtist(t.artist);
                      setAddError(null); setAddDuplicate(null);
                    }}
                  />

                  {/* Line: Dance Name + Song Name + Artist */}
                  {addMode === "line" && (
                    <>
                      <Input
                        value={addDanceName}
                        onChange={e => { setAddDanceName(e.target.value); setAddError(null); setAddDuplicate(null); }}
                        placeholder="Dance Name *"
                        className="h-9 rounded-lg text-sm bg-background/80"
                        data-testid="add-dance-name"
                      />
                      <Input
                        value={addSongName}
                        onChange={e => { setAddSongName(e.target.value); setAddError(null); setAddDuplicate(null); }}
                        placeholder="Song Name *"
                        className="h-9 rounded-lg text-sm bg-background/80"
                        data-testid="add-song-name"
                      />
                      <Input
                        value={addArtist}
                        onChange={e => setAddArtist(e.target.value)}
                        placeholder="Artist (Optional)"
                        className="h-9 rounded-lg text-sm bg-background/80"
                        data-testid="add-artist"
                      />
                    </>
                  )}

                  {/* Swing: Song Name + Artist + Style */}
                  {addMode === "swing" && (
                    <>
                      <Input
                        value={addSongName}
                        onChange={e => { setAddSongName(e.target.value); setAddError(null); setAddDuplicate(null); }}
                        placeholder="Song Name *"
                        className="h-9 rounded-lg text-sm bg-background/80"
                        data-testid="add-song-name"
                      />
                      <Input
                        value={addArtist}
                        onChange={e => setAddArtist(e.target.value)}
                        placeholder="Artist (Optional)"
                        className="h-9 rounded-lg text-sm bg-background/80"
                        data-testid="add-artist"
                      />
                      <Select value={addSwingStyle} onValueChange={v => setAddSwingStyle(v as StyleOption)}>
                        <SelectTrigger className="h-9 rounded-lg text-sm bg-background/80">
                          <SelectValue />
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
                      {addSwingStyle === "OTHER" && (
                        <Input
                          value={addStyleCustom}
                          onChange={e => setAddStyleCustom(e.target.value)}
                          placeholder="Custom style name *"
                          className="h-9 rounded-lg text-sm bg-background/80"
                          data-testid="add-style-custom"
                        />
                      )}
                    </>
                  )}

                  {/* Error */}
                  {addError && <p className="text-xs text-destructive">{addError}</p>}

                  {/* Duplicate warning */}
                  {addDuplicate && (
                    <div className="rounded-lg border border-amber-400/50 bg-amber-50 dark:bg-amber-950/30 p-2 space-y-1.5">
                      <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">Already in library:</p>
                      <p className="text-xs text-foreground">
                        {addDuplicate.danceName}
                        {addDuplicate.artist ? ` · ${addDuplicate.artist}` : ""}
                      </p>
                      <div className="flex gap-2">
                        <Button type="button" size="sm" variant="outline" className="h-7 text-xs rounded-lg flex-1"
                          onClick={() => handleUseExisting(addDuplicate)} data-testid="button-use-existing">
                          Use Existing
                        </Button>
                        <Button type="button" size="sm" variant="outline" className="h-7 text-xs rounded-lg flex-1"
                          onClick={() => addPendingPayload && doAddSong(addPendingPayload, true)}
                          disabled={addPending} data-testid="button-add-anyway">
                          Add Anyway
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Cancel / Add & Select */}
                  {!addDuplicate && (
                    <div className="flex gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => { resetAddForm(); setAddFormOpen(false); }}
                        className="flex-1 text-sm text-muted-foreground hover:text-foreground font-medium py-1.5"
                        data-testid="button-add-cancel"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleAddSubmit}
                        disabled={addPending}
                        className="flex-1 py-1.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                        style={{ background: addMode === "line" ? "#D85C31" : "#3B82F6" }}
                        data-testid="button-add-to-library"
                      >
                        {addPending ? "Adding…" : "Add & Select"}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Dances label + tab pills + count */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold flex-shrink-0">Dances</span>
                <div className="flex items-center gap-1">
                  {tabPill("line", "Line")}
                  {tabPill("swing", "Swing")}
                  {tabPill("all", "ALL")}
                </div>
                {totalDances > 0 && (
                  <span className="ml-auto text-xs text-muted-foreground flex-shrink-0">
                    {totalDances} · {uniqueDances} unique
                  </span>
                )}
              </div>
            </div>

            {/* Scrollable library list */}
            <div
              className="flex-1 min-h-0 overflow-y-auto mx-4 mt-1 mb-2 rounded-xl border border-border/40 bg-secondary/10"
              style={{ WebkitOverflowScrolling: "touch", touchAction: "pan-y" }}
              data-testid="list-song-library"
            >
              {filteredSongs.length === 0 ? (
                <div className="py-6 px-4 flex flex-col items-center gap-3">
                  {searchQuery.trim() ? (
                    <>
                      <p className="text-sm text-muted-foreground text-center">
                        No results for "<span className="font-medium text-foreground">{searchQuery}</span>"
                      </p>
                      <div className="flex gap-2 w-full">
                        <button
                          type="button"
                          data-testid="button-add-as-dance"
                          onClick={() => {
                            resetAddForm();
                            setAddDanceName(searchQuery);
                            setAddMode("line");
                            setAddFormOpen(true);
                          }}
                          className="flex-1 py-2 rounded-xl border-2 border-primary/50 text-primary text-sm font-semibold hover:bg-primary/5 transition-colors"
                        >
                          Add as Dance
                        </button>
                        <button
                          type="button"
                          data-testid="button-add-as-song"
                          onClick={() => {
                            setAddDanceName(""); setAddSongName(""); setAddArtist("");
                            setAddSwingStyle("WCS"); setAddStyleCustom("");
                            setAddError(null); setAddDuplicate(null); setAddPendingPayload(null);
                            setSpotifyInitialQuery(searchQuery);
                            setSpotifyResetKey(k => k + 1);
                            setAddFormOpen(true);
                          }}
                          className="flex-1 py-2 rounded-xl border-2 border-border text-foreground text-sm font-semibold hover:bg-secondary/60 transition-colors"
                        >
                          Add as Song
                        </button>
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center">
                      {libTab === "all" ? "No songs in your library yet." : `No ${libTab === "line" ? "line dances" : "swing songs"} yet.`}
                    </p>
                  )}
                </div>
              ) : (
                <div className="divide-y divide-border/30">
                  {filteredSongs.map(song => {
                    const qty = quantities.get(song.id) ?? 0;
                    const isSelected = qty > 0;
                    return (
                      <div
                        key={song.id}
                        className={`flex h-[72px] items-center gap-3 px-4 transition-colors ${isSelected ? "bg-primary/[0.06]" : ""}`}
                        data-testid={`session-song-item-${song.id}`}
                      >
                        {/* Checkbox */}
                        <button
                          type="button"
                          onClick={() => toggleSong(song.id)}
                          className={`w-5 h-5 rounded-[5px] border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                            isSelected
                              ? "border-primary bg-primary text-white"
                              : "border-muted-foreground/40 bg-transparent hover:border-primary/50"
                          }`}
                          data-testid={`checkbox-song-${song.id}`}
                        >
                          {isSelected && (
                            <svg viewBox="0 0 10 8" className="w-2.5 h-2.5 fill-none stroke-current" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M1 4l3 3 5-6" />
                            </svg>
                          )}
                        </button>

                        {/* Song info — matches reference: DanceName · Artist [tag] / SongName */}
                        <div className="flex-1 min-w-0">
                          <div className="flex min-w-0 items-center gap-1.5 leading-tight">
                            <span className="truncate text-base font-semibold">{song.danceName}</span>
                            {song.artist && (
                              <span className="truncate text-sm text-muted-foreground">
                                · {song.artist}
                              </span>
                            )}
                            <div className="shrink-0">
                              <StyleTag
                                style={(song as any).style || "LINE"}
                                styleCustom={(song as any).styleCustom}
                              />
                            </div>
                          </div>
                          {song.songName && song.songName !== song.danceName && (
                            <p className="mt-1 truncate text-sm leading-tight text-muted-foreground">
                              {song.songName}
                            </p>
                          )}
                        </div>

                        {/* Qty controls if selected */}
                        {isSelected && (
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <button
                              type="button"
                              onClick={() => setQty(song.id, -1)}
                              className="w-8 h-8 rounded-full border border-border flex items-center justify-center hover:bg-secondary transition-colors"
                              data-testid={`button-qty-minus-${song.id}`}
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="w-6 text-center text-base font-bold text-primary" data-testid={`text-qty-${song.id}`}>{qty}</span>
                            <button
                              type="button"
                              onClick={() => setQty(song.id, 1)}
                              className="w-8 h-8 rounded-full border border-border flex items-center justify-center hover:bg-secondary transition-colors"
                              data-testid={`button-qty-plus-${song.id}`}
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex gap-2 px-4 pb-4">
              {existingSession && (
                <Button
                  type="button" variant="destructive"
                  className="rounded-xl h-11 px-3"
                  onClick={handleDelete} disabled={deleteSession.isPending}
                  data-testid="button-delete-session"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
              <Button
                type="submit"
                className="flex-1 rounded-xl h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-base shadow-lg shadow-primary/20"
                disabled={isSubmitting}
                data-testid="button-save-session"
              >
                {isSubmitting ? "Saving…" : existingSession ? "Update Session" : "Create Session"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}