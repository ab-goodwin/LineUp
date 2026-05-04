import { useState } from "react";
import { useSongs, useCreateSong, useUpdateSong, useDeleteSong } from "@/hooks/use-songs";
import { useSessions } from "@/hooks/use-sessions";
import { useLocations, useCreateLocation, useDeleteLocation } from "@/hooks/use-locations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertSongSchema } from "@shared/schema";
import { RatingStars } from "@/components/RatingStars";
import { SpotifySearch } from "@/components/SpotifySearch";
import { Search, Plus, Music, Edit2, Trash2, MapPin } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

const songFormSchema = insertSongSchema.omit({ publicId: true });
type SongFormValues = z.infer<typeof songFormSchema>;

function SongForm({ initialData, onClose }: { initialData?: any; onClose: () => void }) {
  const createSong = useCreateSong();
  const updateSong = useUpdateSong();

  const form = useForm<SongFormValues>({
    resolver: zodResolver(songFormSchema),
    defaultValues: initialData || { danceName: "", songName: "", artist: "", rating: 0 },
  });

  const onSubmit = async (values: SongFormValues) => {
    try {
      if (initialData) {
        await updateSong.mutateAsync({ id: initialData.id, ...values });
      } else {
        await createSong.mutateAsync(values);
      }
      onClose();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="danceName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Dance Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Tush Push" className="rounded-xl" data-testid="input-dance-name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="space-y-2">
          <FormLabel>Song</FormLabel>
          {!initialData && (
            <SpotifySearch
              placeholder="Search Spotify for a song..."
              onSelect={(track) => {
                form.setValue("songName", track.name);
                form.setValue("artist", track.artist);
              }}
            />
          )}
          <FormField
            control={form.control}
            name="songName"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input placeholder="Song title" className="rounded-xl" data-testid="input-song-name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="artist"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input placeholder="Artist (optional)" className="rounded-xl" data-testid="input-artist" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="rating"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Rating</FormLabel>
              <FormControl>
                <div className="py-2">
                  <RatingStars rating={field.value} onRate={field.onChange} className="gap-2" />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button
          type="submit"
          className="w-full rounded-xl font-bold mt-4"
          disabled={createSong.isPending || updateSong.isPending}
          data-testid="button-submit-song"
        >
          {initialData ? "Update Song" : "Add to Library"}
        </Button>
      </form>
    </Form>
  );
}

function LocationsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { data: locations = [] } = useLocations();
  const createLocation = useCreateLocation();
  const deleteLocation = useDeleteLocation();
  const [newName, setNewName] = useState("");

  const handleAdd = async () => {
    if (!newName.trim()) return;
    await createLocation.mutateAsync(newName.trim());
    setNewName("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl bg-card max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-display text-xl text-primary flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Saved Locations
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
          {locations.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              No saved locations yet. Add one below!
            </p>
          ) : (
            <AnimatePresence mode="popLayout">
              {locations.map(loc => (
                <motion.div
                  key={loc.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="flex items-center justify-between bg-secondary/30 rounded-xl px-4 py-2.5"
                  data-testid={`location-item-${loc.id}`}
                >
                  <span className="text-sm font-medium">{loc.name}</span>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => deleteLocation.mutateAsync(loc.id)}
                    data-testid={`button-delete-location-${loc.id}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>

        <div className="flex gap-2 pt-2 border-t border-border">
          <Input
            placeholder="New location name..."
            className="rounded-xl flex-1"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleAdd()}
            data-testid="input-new-location-name"
          />
          <Button
            onClick={handleAdd}
            disabled={!newName.trim() || createLocation.isPending}
            className="rounded-xl px-4"
            data-testid="button-add-location"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function Library() {
  const { data: songs = [], isLoading } = useSongs();
  const { data: sessions = [] } = useSessions();
  const deleteSong = useDeleteSong();
  const [search, setSearch] = useState("");
  const [editingSong, setEditingSong] = useState<any>(null);
  const [isSongDialogOpen, setIsSongDialogOpen] = useState(false);
  const [isLocationsDialogOpen, setIsLocationsDialogOpen] = useState(false);

  const filteredSongs = songs
    .filter(s =>
      s.danceName.toLowerCase().includes(search.toLowerCase()) ||
      s.songName.toLowerCase().includes(search.toLowerCase()) ||
      (s.artist && s.artist.toLowerCase().includes(search.toLowerCase()))
    )
    .sort((a, b) => a.danceName.localeCompare(b.danceName));

  const handleDelete = async (id: number) => {
    if (confirm("Are you sure? This will remove the song and affect stats.")) {
      await deleteSong.mutateAsync(id);
    }
  };

  return (
    <div className="container px-4 pb-24 pt-8 mx-auto max-w-4xl">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-3">
        <h1 className="text-3xl font-display font-bold">Song Library</h1>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="rounded-xl border-2"
            onClick={() => setIsLocationsDialogOpen(true)}
            data-testid="button-manage-locations"
          >
            <MapPin className="w-4 h-4 mr-2" />
            Locations
          </Button>

          <Dialog open={isSongDialogOpen} onOpenChange={setIsSongDialogOpen}>
            <DialogTrigger asChild>
              <Button
                className="rounded-xl shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90 text-primary-foreground"
                onClick={() => setEditingSong(null)}
                data-testid="button-add-song"
              >
                <Plus className="w-5 h-5 mr-2" />
                Add Song
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-2xl bg-card">
              <DialogHeader>
                <DialogTitle className="font-display text-xl text-primary">
                  {editingSong ? "Edit Song" : "Add New Song"}
                </DialogTitle>
              </DialogHeader>
              <SongForm initialData={editingSong} onClose={() => setIsSongDialogOpen(false)} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input
          placeholder="Search dances, songs, or artists..."
          className="pl-10 h-12 rounded-xl bg-card border-border shadow-sm"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          data-testid="input-library-search"
        />
      </div>

      <div className="space-y-3">
        {isLoading ? (
          <div className="text-center py-10 text-muted-foreground">Loading library...</div>
        ) : filteredSongs.length === 0 ? (
          <div className="text-center py-16 bg-secondary/20 rounded-2xl border-2 border-dashed border-border">
            <Music className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
            <p className="font-medium text-lg">No songs found</p>
            <p className="text-muted-foreground text-sm">Add some tunes to get started!</p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {filteredSongs.map((song) => (
              <motion.div
                key={song.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="group bg-card p-4 rounded-xl border border-border shadow-sm hover:shadow-md transition-all flex items-center justify-between"
                data-testid={`card-song-${song.id}`}
              >
                <div className="flex-1 min-w-0 mr-4">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-lg truncate font-display text-foreground">{song.danceName}</h3>
                    {(() => {
                      const count = sessions.filter(session =>
                        session.dances.some(d => d.id === song.id)
                      ).length;
                      if (count > 0) {
                        return (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary">
                            Done {count}x
                          </span>
                        );
                      }
                      return null;
                    })()}
                  </div>
                  <p className="text-muted-foreground text-sm truncate">
                    {song.songName}
                    {song.artist ? <span className="text-muted-foreground/70"> · {song.artist}</span> : null}
                  </p>
                  <div className="mt-2">
                    <RatingStars rating={song.rating} readonly className="w-4 h-4" />
                  </div>
                </div>

                <div className="flex items-center gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-9 w-9 text-muted-foreground hover:text-primary rounded-lg"
                    onClick={() => {
                      setEditingSong(song);
                      setIsSongDialogOpen(true);
                    }}
                    data-testid={`button-edit-song-${song.id}`}
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-9 w-9 text-muted-foreground hover:text-destructive rounded-lg"
                    onClick={() => handleDelete(song.id)}
                    data-testid={`button-delete-song-${song.id}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      <LocationsDialog open={isLocationsDialogOpen} onOpenChange={setIsLocationsDialogOpen} />
    </div>
  );
}
