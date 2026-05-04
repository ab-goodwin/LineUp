import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { ScrollArea } from "@/components/ui/scroll-area";
import { insertSessionSchema } from "@shared/schema";
import { useCreateSession, useUpdateSession, useDeleteSession } from "@/hooks/use-sessions";
import { useSongs } from "@/hooks/use-songs";
import { format } from "date-fns";
import { Trash2, Search, PlusCircle } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { useCreateSong } from "@/hooks/use-songs";
import { SpotifySearch } from "@/components/SpotifySearch";

const formSchema = insertSessionSchema.extend({
  danceIds: z.array(z.number()),
});

type FormValues = z.infer<typeof formSchema>;

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
  const [newSong, setNewSong] = useState({ danceName: "", songName: "", artist: "" });

  const filteredSongs = songs
    .filter(s => 
      s.danceName.toLowerCase().includes(searchQuery.toLowerCase()) || 
      s.songName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.artist && s.artist.toLowerCase().includes(searchQuery.toLowerCase()))
    )
    .sort((a, b) => a.danceName.localeCompare(b.danceName));

  const handleQuickAddSong = async () => {
    if (!newSong.danceName || !newSong.songName) return;
    try {
      const created = await createSong.mutateAsync({
        danceName: newSong.danceName,
        songName: newSong.songName,
        artist: newSong.artist,
        rating: 0
      });
      form.setValue("danceIds", [...form.getValues("danceIds"), created.id]);
      setNewSong({ danceName: "", songName: "", artist: "" });
      setIsAddingSong(false);
    } catch (error) {
      console.error("Failed to add song", error);
    }
  };

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      location: "",
      date: date,
      danceIds: [],
    },
  });

  useEffect(() => {
    if (existingSession) {
      form.reset({
        location: existingSession.location,
        date: new Date(existingSession.date),
        danceIds: existingSession.dances.map((d: any) => d.id),
      });
    } else {
      form.reset({
        location: "",
        date: date,
        danceIds: [],
      });
    }
    setIsAddingSong(false);
    setNewSong({ danceName: "", songName: "", artist: "" });
  }, [existingSession, date, isOpen, form]);

  const onSubmit = async (values: FormValues) => {
    try {
      if (existingSession) {
        await updateSession.mutateAsync({ 
          id: existingSession.id, 
          ...values 
        });
      } else {
        await createSession.mutateAsync(values);
      }
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to save session", error);
    }
  };

  const handleDelete = async () => {
    if (!existingSession) return;
    if (confirm("Are you sure you want to delete this session?")) {
      await deleteSession.mutateAsync(existingSession.id);
      onOpenChange(false);
    }
  };

  const isSubmitting = createSession.isPending || updateSession.isPending;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md w-full bg-card rounded-2xl sm:rounded-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl text-primary">
            {existingSession ? "Edit Session" : "New Session"}
          </DialogTitle>
          <p className="text-muted-foreground text-sm">
            {format(date, "MMMM do, yyyy")}
          </p>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 flex-1 overflow-hidden flex flex-col">
            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="e.g. The Dusty Boot Saloon" 
                      className="rounded-xl border-2 focus-visible:ring-primary/20"
                      data-testid="input-session-location"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex-1 overflow-hidden flex flex-col min-h-[300px]">
              <div className="flex items-center justify-between mb-2">
                <FormLabel>Dances Done</FormLabel>
                <div className="flex items-center gap-2">
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8"
                    onClick={() => setIsAddingSong(!isAddingSong)}
                    data-testid="button-toggle-add-song"
                  >
                    <PlusCircle className="w-4 h-4 text-primary" />
                  </Button>
                  <div className="relative w-32">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <Input 
                      placeholder="Search..." 
                      className="h-8 pl-8 text-xs rounded-lg"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      data-testid="input-session-song-search"
                    />
                  </div>
                </div>
              </div>

              {isAddingSong && (
                <div className="mb-4 p-3 border-2 border-primary/20 rounded-xl bg-primary/5 space-y-3">
                  <SpotifySearch
                    placeholder="Search Spotify for a song..."
                    onSelect={(track) => {
                      setNewSong(prev => ({ ...prev, songName: track.name, artist: track.artist }));
                    }}
                  />
                  <Input 
                    placeholder="Dance Name *" 
                    className="h-8 text-xs"
                    value={newSong.danceName}
                    onChange={(e) => setNewSong(prev => ({ ...prev, danceName: e.target.value }))}
                    data-testid="input-new-dance-name"
                  />
                  <Input 
                    placeholder="Song Name *" 
                    className="h-8 text-xs"
                    value={newSong.songName}
                    onChange={(e) => setNewSong(prev => ({ ...prev, songName: e.target.value }))}
                    data-testid="input-new-song-name"
                  />
                  <Input 
                    placeholder="Artist (auto-filled from Spotify)" 
                    className="h-8 text-xs"
                    value={newSong.artist}
                    onChange={(e) => setNewSong(prev => ({ ...prev, artist: e.target.value }))}
                    data-testid="input-new-artist"
                  />
                  <div className="flex justify-end gap-2">
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="sm" 
                      className="h-7 text-xs"
                      onClick={() => setIsAddingSong(false)}
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="button" 
                      size="sm" 
                      className="h-7 text-xs"
                      onClick={handleQuickAddSong}
                      disabled={createSong.isPending || !newSong.danceName || !newSong.songName}
                      data-testid="button-add-and-select"
                    >
                      Add & Select
                    </Button>
                  </div>
                </div>
              )}

              <ScrollArea className="flex-1 border-2 border-border/50 rounded-xl p-4 bg-secondary/20">
                <FormField
                  control={form.control}
                  name="danceIds"
                  render={() => (
                    <div className="space-y-3">
                      {songs.length === 0 ? (
                        <div className="text-center text-muted-foreground py-8 text-sm">
                          No songs in library. Go to Library tab to add some!
                        </div>
                      ) : filteredSongs.length === 0 ? (
                        <div className="text-center text-muted-foreground py-8 text-sm">
                          No matching songs found.
                        </div>
                      ) : (
                        filteredSongs.map((song) => (
                          <FormField
                            key={song.id}
                            control={form.control}
                            name="danceIds"
                            render={({ field }) => {
                              return (
                                <FormItem
                                  key={song.id}
                                  className="flex flex-row items-start space-x-3 space-y-0 rounded-lg border p-3 hover:bg-secondary/50 transition-colors cursor-pointer"
                                  data-testid={`session-song-item-${song.id}`}
                                >
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value?.includes(song.id)}
                                      onCheckedChange={(checked) => {
                                        return checked
                                          ? field.onChange([...field.value, song.id])
                                          : field.onChange(
                                              field.value?.filter(
                                                (value) => value !== song.id
                                              )
                                            )
                                      }}
                                    />
                                  </FormControl>
                                  <div className="space-y-1 leading-none">
                                    <FormLabel className="font-bold cursor-pointer">
                                      {song.danceName}
                                    </FormLabel>
                                    <p className="text-xs text-muted-foreground">
                                      {song.songName}
                                      {song.artist ? <span className="text-muted-foreground/70"> · {song.artist}</span> : null}
                                    </p>
                                  </div>
                                </FormItem>
                              )
                            }}
                          />
                        ))
                      )}
                    </div>
                  )}
                />
              </ScrollArea>
            </div>

            <div className="flex gap-3 pt-4">
              {existingSession && (
                <Button
                  type="button"
                  variant="destructive"
                  className="rounded-xl"
                  onClick={handleDelete}
                  disabled={deleteSession.isPending}
                  data-testid="button-delete-session"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
              <Button 
                type="submit" 
                className="flex-1 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-lg shadow-primary/25"
                disabled={isSubmitting}
                data-testid="button-save-session"
              >
                {isSubmitting ? "Saving..." : existingSession ? "Update Session" : "Create Session"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
