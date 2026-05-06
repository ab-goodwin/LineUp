import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { LocationCombobox } from "@/components/LocationCombobox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { insertSessionSchema, STYLE_INFO, STYLE_OPTIONS, type StyleOption } from "@shared/schema";
import { useCreateSession, useUpdateSession, useDeleteSession } from "@/hooks/use-sessions";
import { useSongs, useCreateSong } from "@/hooks/use-songs";
import { format } from "date-fns";
import { Trash2, Search, PlusCircle } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { SpotifySearch } from "@/components/SpotifySearch";
import { StyleTag } from "@/lib/style-tags";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const formSchema = insertSessionSchema.extend({
  danceIds: z.array(z.number()),
});
type FormValues = z.infer<typeof formSchema>;

const SWING_STYLES = STYLE_OPTIONS.filter(s => s !== 'LINE');

interface SessionDialogProps {
  date: Date;
  existingSession?: any;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SessionDialog({ date, existingSession, isOpen, onOpenChange }: SessionDialogProps) {
  const { data: songs = [] } = useSongs();
  const createSession = useCreateSession();
  const updateSession = useUpdateSession();
  const deleteSession = useDeleteSession();
  const createSong = useCreateSong();

  const [searchQuery, setSearchQuery] = useState("");
  const [isAddingSong, setIsAddingSong] = useState(false);
  const [danceType, setDanceType] = useState<"line" | "swing">("line");

  // Line quick-add state
  const [newLine, setNewLine] = useState({ danceName: "", songName: "", artist: "" });

  // Swing quick-add state
  const [newSwing, setNewSwing] = useState({ songName: "", artist: "", style: "WCS" as StyleOption, styleCustom: "" });

  const SWING_STYLES_SET = new Set(["WCS", "ECS", "CSW", "TWO", "OTHER"]);

  const filteredSongs = songs
    .filter(s => {
      const style = (s as any).style || "LINE";
      return danceType === "line" ? style === "LINE" : SWING_STYLES_SET.has(style);
    })
    .filter(s =>
      s.songName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.danceName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.artist && s.artist.toLowerCase().includes(searchQuery.toLowerCase()))
    )
    .sort((a, b) => a.songName.localeCompare(b.songName));

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { location: "", date: date, danceIds: [] },
  });

  useEffect(() => {
    if (existingSession) {
      form.reset({
        location: existingSession.location,
        date: new Date(existingSession.date),
        danceIds: existingSession.dances.map((d: any) => d.id),
      });
    } else {
      form.reset({ location: "", date: date, danceIds: [] });
    }
    setIsAddingSong(false);
    setNewLine({ danceName: "", songName: "", artist: "" });
    setNewSwing({ songName: "", artist: "", style: "WCS", styleCustom: "" });
    setDanceType("line");
    setSearchQuery("");
  }, [existingSession, date, isOpen]);

  const handleQuickAddLine = async () => {
    if (!newLine.danceName || !newLine.songName) return;
    try {
      const created = await createSong.mutateAsync({
        danceName: newLine.danceName, songName: newLine.songName,
        artist: newLine.artist, rating: 0, style: "LINE",
      });
      form.setValue("danceIds", [...form.getValues("danceIds"), created.id]);
      setNewLine({ danceName: "", songName: "", artist: "" });
      setIsAddingSong(false);
    } catch (e) { console.error(e); }
  };

  const handleQuickAddSwing = async () => {
    if (!newSwing.songName) return;
    const styleName = newSwing.style === 'OTHER' && newSwing.styleCustom
      ? newSwing.styleCustom
      : STYLE_INFO[newSwing.style].label;
    try {
      const created = await createSong.mutateAsync({
        danceName: styleName, songName: newSwing.songName,
        artist: newSwing.artist, rating: 0, style: newSwing.style,
        styleCustom: newSwing.style === 'OTHER' ? newSwing.styleCustom || null : null,
      });
      form.setValue("danceIds", [...form.getValues("danceIds"), created.id]);
      setNewSwing({ songName: "", artist: "", style: "WCS", styleCustom: "" });
      setIsAddingSong(false);
    } catch (e) { console.error(e); }
  };

  const onSubmit = async (values: FormValues) => {
    try {
      if (existingSession) {
        await updateSession.mutateAsync({ id: existingSession.id, ...values });
      } else {
        await createSession.mutateAsync(values);
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

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md w-full bg-card rounded-2xl sm:rounded-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl text-primary">
            {existingSession ? "Edit Session" : "New Session"}
          </DialogTitle>
          <p className="text-muted-foreground text-sm">{format(date, "MMMM do, yyyy")}</p>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 flex-1 overflow-hidden flex flex-col">
            <FormField control={form.control} name="location" render={({ field }) => (
              <FormItem>
                <FormLabel>Location</FormLabel>
                <FormControl>
                  <LocationCombobox value={field.value} onChange={field.onChange} placeholder="Select or type a location..." />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="flex-1 overflow-hidden flex flex-col min-h-[300px]">
              {/* Header row: label + Line/Swing toggle + add button + search */}
              <div className="flex items-center justify-between mb-2 gap-2">
                <div className="flex items-center gap-2 flex-shrink-0">
                  <FormLabel className="mb-0">Dances</FormLabel>
                  <div className="flex rounded-lg overflow-hidden border border-border text-xs">
                    <button type="button"
                      className={`px-2.5 py-1 font-medium transition-colors ${danceType === "line" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-secondary"}`}
                      onClick={() => { setDanceType("line"); setIsAddingSong(false); }}>Line</button>
                    <button type="button"
                      className={`px-2.5 py-1 font-medium transition-colors ${danceType === "swing" ? "bg-blue-500 text-white" : "bg-background text-muted-foreground hover:bg-secondary"}`}
                      onClick={() => { setDanceType("swing"); setIsAddingSong(false); }}>Swing</button>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8"
                    onClick={() => setIsAddingSong(v => !v)} data-testid="button-toggle-add-song">
                    <PlusCircle className={`w-4 h-4 ${danceType === "swing" ? "text-blue-500" : "text-primary"}`} />
                  </Button>
                  <div className="relative w-28">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <Input placeholder="Search…" className="h-8 pl-7 text-xs rounded-lg"
                      value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                  </div>
                </div>
              </div>

              {/* Line dance quick-add */}
              {isAddingSong && danceType === "line" && (
                <div className="mb-3 p-3 border-2 border-primary/20 rounded-xl bg-primary/5 space-y-2">
                  <SpotifySearch placeholder="Search Spotify…"
                    onSelect={t => setNewLine(p => ({ ...p, songName: t.name, artist: t.artist }))} />
                  <Input placeholder="Dance Name *" className="h-8 text-xs" value={newLine.danceName}
                    onChange={e => setNewLine(p => ({ ...p, danceName: e.target.value }))} />
                  <Input placeholder="Song Name *" className="h-8 text-xs" value={newLine.songName}
                    onChange={e => setNewLine(p => ({ ...p, songName: e.target.value }))} />
                  <Input placeholder="Artist (Optional)" className="h-8 text-xs" value={newLine.artist}
                    onChange={e => setNewLine(p => ({ ...p, artist: e.target.value }))} />
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setIsAddingSong(false)}>Cancel</Button>
                    <Button type="button" size="sm" className="h-7 text-xs" onClick={handleQuickAddLine}
                      disabled={createSong.isPending || !newLine.danceName || !newLine.songName}>Add & Select</Button>
                  </div>
                </div>
              )}

              {/* Swing quick-add */}
              {isAddingSong && danceType === "swing" && (
                <div className="mb-3 p-3 border-2 border-blue-200 rounded-xl bg-blue-50/50 space-y-2">
                  <SpotifySearch placeholder="Search Spotify…"
                    onSelect={t => setNewSwing(p => ({ ...p, songName: t.name, artist: t.artist }))} />
                  <Input placeholder="Song Name *" className="h-8 text-xs" value={newSwing.songName}
                    onChange={e => setNewSwing(p => ({ ...p, songName: e.target.value }))} />
                  <Input placeholder="Artist (Optional)" className="h-8 text-xs" value={newSwing.artist}
                    onChange={e => setNewSwing(p => ({ ...p, artist: e.target.value }))} />
                  <Select value={newSwing.style} onValueChange={v => setNewSwing(p => ({ ...p, style: v as StyleOption }))}>
                    <SelectTrigger className="h-8 text-xs rounded-lg">
                      <SelectValue placeholder="Style" />
                    </SelectTrigger>
                    <SelectContent>
                      {SWING_STYLES.map(s => (
                        <SelectItem key={s} value={s}>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold px-1 rounded" style={{ color: STYLE_INFO[s].color }}>{STYLE_INFO[s].short}</span>
                            {STYLE_INFO[s].label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {newSwing.style === 'OTHER' && (
                    <Input placeholder="Custom style name" className="h-8 text-xs" value={newSwing.styleCustom}
                      onChange={e => setNewSwing(p => ({ ...p, styleCustom: e.target.value }))} />
                  )}
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setIsAddingSong(false)}>Cancel</Button>
                    <Button type="button" size="sm" className="h-7 text-xs bg-blue-500 hover:bg-blue-600 text-white" onClick={handleQuickAddSwing}
                      disabled={createSong.isPending || !newSwing.songName}>Add & Select</Button>
                  </div>
                </div>
              )}

              {/* Song list */}
              <ScrollArea className="flex-1 border-2 border-border/50 rounded-xl p-3 bg-secondary/20">
                <FormField control={form.control} name="danceIds" render={() => (
                  <div className="space-y-2">
                    {filteredSongs.length === 0 ? (
                      <div className="text-center text-muted-foreground py-8 text-sm">
                        {songs.filter(s => danceType === "line"
                          ? ((s as any).style || "LINE") === "LINE"
                          : SWING_STYLES_SET.has((s as any).style)).length === 0
                          ? `No ${danceType === "line" ? "line dances" : "swing songs"} in library yet.`
                          : "No matching songs found."}
                      </div>
                    ) : filteredSongs.map(song => (
                      <FormField key={song.id} control={form.control} name="danceIds" render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-lg border p-2.5 hover:bg-secondary/50 transition-colors cursor-pointer"
                          data-testid={`session-song-item-${song.id}`}>
                          <FormControl>
                            <Checkbox checked={field.value?.includes(song.id)}
                              onCheckedChange={checked => checked
                                ? field.onChange([...field.value, song.id])
                                : field.onChange(field.value?.filter(v => v !== song.id))} />
                          </FormControl>
                          <div className="leading-none flex-1 min-w-0">
                            {/* Song name + artist on top line */}
                            <FormLabel className="font-bold cursor-pointer text-sm flex items-center gap-1.5 flex-wrap">
                              {song.songName || song.danceName}
                              {song.artist && <span className="font-normal text-muted-foreground">· {song.artist}</span>}
                              <StyleTag style={(song as any).style || "LINE"} styleCustom={(song as any).styleCustom} />
                            </FormLabel>
                            {/* Dance name below */}
                            <p className="text-xs text-muted-foreground mt-0.5">{song.danceName}</p>
                          </div>
                        </FormItem>
                      )} />
                    ))}
                  </div>
                )} />
              </ScrollArea>
            </div>

            <div className="flex gap-3 pt-2">
              {existingSession && (
                <Button type="button" variant="destructive" className="rounded-xl" onClick={handleDelete}
                  disabled={deleteSession.isPending} data-testid="button-delete-session">
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
              <Button type="submit" className="flex-1 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-lg shadow-primary/25"
                disabled={isSubmitting} data-testid="button-save-session">
                {isSubmitting ? "Saving…" : existingSession ? "Update Session" : "Create Session"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
