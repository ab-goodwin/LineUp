import { useState } from "react";
import { useSongs, useCreateSong, useUpdateSong, useDeleteSong, useToggleFavorite } from "@/hooks/use-songs";
import { useSessions } from "@/hooks/use-sessions";
import { useLocations, useCreateLocation, useDeleteLocation } from "@/hooks/use-locations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertSongSchema, STYLE_INFO, STYLE_OPTIONS, type StyleOption } from "@shared/schema";
import { RatingStars } from "@/components/RatingStars";
import { SpotifySearch } from "@/components/SpotifySearch";
import { Search, Plus, Music, Edit2, Trash2, MapPin, Footprints, Heart } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StyleTag } from "@/lib/style-tags";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const lineSongSchema = insertSongSchema.omit({ publicId: true, style: true, styleCustom: true, isFavorite: true }).extend({
  songName: z.string().min(1, "Song name is required"),
});
type LineSongValues = z.infer<typeof lineSongSchema>;

const swingSongSchema = z.object({
  songName: z.string().min(1, "Song name required"),
  artist: z.string().default(""),
  style: z.enum(['WCS', 'ECS', 'CSW', 'TWO', 'OTHER'] as const),
  styleCustom: z.string().optional(),
  rating: z.number().default(0),
});
type SwingSongValues = z.infer<typeof swingSongSchema>;

const SWING_STYLES = STYLE_OPTIONS.filter(s => s !== 'LINE');

function LineSongForm({ initialData, onClose }: { initialData?: any; onClose: () => void }) {
  const createSong = useCreateSong();
  const updateSong = useUpdateSong();

  const form = useForm<LineSongValues>({
    resolver: zodResolver(lineSongSchema),
    defaultValues: initialData
      ? { danceName: initialData.danceName, songName: initialData.songName, artist: initialData.artist, rating: initialData.rating }
      : { danceName: "", songName: "", artist: "", rating: 0 },
  });

  const onSubmit = async (values: LineSongValues) => {
    try {
      if (initialData) {
        await updateSong.mutateAsync({ id: initialData.id, ...values, style: 'LINE' });
      } else {
        await createSong.mutateAsync({ ...values, style: 'LINE' });
      }
      onClose();
    } catch (e) { console.error(e); }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField control={form.control} name="danceName" render={({ field }) => (
          <FormItem>
            <FormLabel>Dance Name</FormLabel>
            <FormControl><Input placeholder="e.g. Tush Push" className="rounded-xl" data-testid="input-dance-name" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <div className="space-y-2">
          <FormLabel>Song</FormLabel>
          {!initialData && (
            <SpotifySearch placeholder="Search Spotify..." onSelect={(t) => { form.setValue("songName", t.name); form.setValue("artist", t.artist); }} />
          )}
          <FormField control={form.control} name="songName" render={({ field }) => (
            <FormItem>
              <FormControl><Input placeholder="Song title" className="rounded-xl" data-testid="input-song-name" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="artist" render={({ field }) => (
            <FormItem>
              <FormControl><Input placeholder="Artist name" className="rounded-xl" data-testid="input-artist" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>
        <FormField control={form.control} name="rating" render={({ field }) => (
          <FormItem>
            <FormLabel>Rating</FormLabel>
            <FormControl>
              <div className="flex items-center gap-2">
                <RatingStars rating={field.value} onRate={field.onChange} className="w-6 h-6" />
              </div>
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <Button type="submit" className="w-full rounded-xl font-bold mt-4" disabled={createSong.isPending || updateSong.isPending} data-testid="button-submit-line-song">
          {initialData ? "Update Song" : "Add to Library"}
        </Button>
      </form>
    </Form>
  );
}

function SwingSongForm({ initialData, onClose }: { initialData?: any; onClose: () => void }) {
  const createSong = useCreateSong();
  const updateSong = useUpdateSong();

  const form = useForm<SwingSongValues>({
    resolver: zodResolver(swingSongSchema),
    defaultValues: initialData
      ? { songName: initialData.songName, artist: initialData.artist, style: initialData.style, styleCustom: initialData.styleCustom, rating: initialData.rating }
      : { songName: "", artist: "", style: 'WCS', rating: 0 },
  });

  const watchStyle = form.watch("style");

  const onSubmit = async (values: SwingSongValues) => {
    try {
      const payload = { ...values, danceName: values.songName };
      if (initialData) {
        await updateSong.mutateAsync({ id: initialData.id, ...payload });
      } else {
        await createSong.mutateAsync({ ...payload });
      }
      onClose();
    } catch (e) { console.error(e); }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <FormLabel>Song</FormLabel>
          {!initialData && (
            <SpotifySearch placeholder="Search Spotify..." onSelect={(t) => { form.setValue("songName", t.name); form.setValue("artist", t.artist); }} />
          )}
          <FormField control={form.control} name="songName" render={({ field }) => (
            <FormItem>
              <FormControl><Input placeholder="Song title" className="rounded-xl" data-testid="input-swing-song-name" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="artist" render={({ field }) => (
            <FormItem>
              <FormControl><Input placeholder="Artist name" className="rounded-xl" data-testid="input-swing-artist" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>
        <FormField control={form.control} name="style" render={({ field }) => (
          <FormItem>
            <FormLabel>Style</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl>
                <SelectTrigger className="rounded-xl" data-testid="select-swing-style">
                  <SelectValue placeholder="Choose style" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {SWING_STYLES.map(s => (
                  <SelectItem key={s} value={s} data-testid={`option-style-${s}`}>
                    {STYLE_INFO[s].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )} />
        {watchStyle === 'OTHER' && (
          <FormField control={form.control} name="styleCustom" render={({ field }) => (
            <FormItem>
              <FormLabel>Custom Style Name</FormLabel>
              <FormControl><Input placeholder="e.g. Polka" className="rounded-xl" data-testid="input-style-custom" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        )}
        <FormField control={form.control} name="rating" render={({ field }) => (
          <FormItem>
            <FormLabel>Rating</FormLabel>
            <FormControl>
              <div className="flex items-center gap-2">
                <RatingStars rating={field.value} onRate={field.onChange} className="w-6 h-6" />
              </div>
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <Button type="submit" className="w-full rounded-xl font-bold mt-4" disabled={createSong.isPending || updateSong.isPending} data-testid="button-submit-swing-song">
          {initialData ? "Update Song" : "Add to Swing Library"}
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
            <MapPin className="w-5 h-5" />Saved Locations
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
          {locations.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No saved locations yet.</p>
          ) : (
            <AnimatePresence mode="popLayout">
              {locations.map(loc => (
                <motion.div key={loc.id} layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                  className="flex items-center justify-between bg-secondary/30 rounded-xl px-4 py-2.5" data-testid={`location-item-${loc.id}`}>
                  <span className="text-sm font-medium">{loc.name}</span>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => deleteLocation.mutateAsync(loc.id)} data-testid={`button-delete-location-${loc.id}`}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>
        <div className="flex gap-2 pt-2 border-t border-border">
          <Input placeholder="New location name..." className="rounded-xl flex-1" value={newName}
            onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === "Enter" && handleAdd()} data-testid="input-new-location-name" />
          <Button onClick={handleAdd} disabled={!newName.trim() || createLocation.isPending} className="rounded-xl px-4" data-testid="button-add-location">
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SongCard({ song, sessions, onEdit, onDelete, sortBy, onFavorite }: {
  song: any; sessions: any[]; onEdit: () => void; onDelete: () => void;
  sortBy: "song" | "dance"; onFavorite: () => void;
}) {
  const count = sessions.filter(s => s.dances.some((d: any) => d.id === song.id)).length;

  const title = sortBy === "dance" ? song.danceName : (song.songName || song.danceName);
  const titleArtist = sortBy === "dance" ? "" : (song.artist ? ` · ${song.artist}` : "");
  const subtitle = sortBy === "dance"
    ? `${song.songName}${song.artist ? ` · ${song.artist}` : ""}`
    : song.danceName;

  return (
    <motion.div layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
      className="group bg-card p-4 rounded-xl border border-border shadow-sm hover:shadow-md transition-all flex items-center justify-between"
      data-testid={`card-song-${song.id}`}>
      <div className="flex-1 min-w-0 mr-3">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="font-bold text-lg truncate font-display text-foreground">
            {title}
            {titleArtist && <span className="font-normal text-muted-foreground">{titleArtist}</span>}
          </h3>
          <StyleTag style={song.style} styleCustom={song.styleCustom} />
          {count > 0 && (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary flex-shrink-0">
              Done {count}x
            </span>
          )}
        </div>
        <p className="text-muted-foreground text-sm truncate">{subtitle}</p>
        <div className="mt-2"><RatingStars rating={song.rating} readonly className="w-4 h-4" /></div>
      </div>
      <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
        <Button
          size="icon" variant="ghost"
          className={`h-9 w-9 rounded-lg transition-colors ${song.isFavorite ? "text-pink-500 hover:text-pink-600" : "text-muted-foreground hover:text-pink-400"}`}
          onClick={onFavorite}
          data-testid={`button-favorite-song-${song.id}`}
        >
          <Heart className="w-4 h-4" fill={song.isFavorite ? "currentColor" : "none"} />
        </Button>
        <Button size="icon" variant="ghost" className="h-9 w-9 text-muted-foreground hover:text-primary rounded-lg" onClick={onEdit} data-testid={`button-edit-song-${song.id}`}>
          <Edit2 className="w-4 h-4" />
        </Button>
        <Button size="icon" variant="ghost" className="h-9 w-9 text-muted-foreground hover:text-destructive rounded-lg" onClick={onDelete} data-testid={`button-delete-song-${song.id}`}>
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </motion.div>
  );
}

export default function Library() {
  const { data: songs = [], isLoading } = useSongs();
  const { data: sessions = [] } = useSessions();
  const deleteSong = useDeleteSong();
  const toggleFavorite = useToggleFavorite();
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"song" | "dance">("song");
  const [editingSong, setEditingSong] = useState<any>(null);
  const [isSongDialogOpen, setIsSongDialogOpen] = useState(false);
  const [isLocationsDialogOpen, setIsLocationsDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("linedance");

  const SWING_STYLES_SET = new Set(['WCS', 'ECS', 'CSW', 'TWO', 'OTHER']);

  const sortFn = (a: any, b: any) =>
    sortBy === "dance"
      ? (a.danceName || "").localeCompare(b.danceName || "")
      : (a.songName || "").localeCompare(b.songName || "");

  const searchFilter = (s: any) =>
    s.danceName.toLowerCase().includes(search.toLowerCase()) ||
    s.songName.toLowerCase().includes(search.toLowerCase()) ||
    (s.artist && s.artist.toLowerCase().includes(search.toLowerCase()));

  const lineSongs = songs
    .filter(s => (s as any).style === 'LINE' || !(s as any).style)
    .filter(searchFilter)
    .sort(sortFn);

  const swingSongs = songs
    .filter(s => SWING_STYLES_SET.has((s as any).style))
    .filter(searchFilter)
    .sort(sortFn);

  const handleDelete = async (id: number) => {
    if (confirm("Are you sure? This will remove the song and affect stats.")) {
      await deleteSong.mutateAsync(id);
    }
  };

  const isSwingEditing = editingSong && SWING_STYLES_SET.has(editingSong.style);

  return (
    <div className="container px-4 pb-24 pt-8 mx-auto max-w-4xl">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-3">
        <h1 className="text-3xl font-display font-bold">Song Library</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="rounded-xl border-2" onClick={() => setIsLocationsDialogOpen(true)} data-testid="button-manage-locations">
            <MapPin className="w-4 h-4 mr-2" />Locations
          </Button>
          <Dialog open={isSongDialogOpen} onOpenChange={setIsSongDialogOpen}>
            <DialogTrigger asChild>
              <Button className="rounded-xl shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90 text-primary-foreground"
                onClick={() => setEditingSong(null)} data-testid="button-add-song">
                <Plus className="w-5 h-5 mr-2" />
                {activeTab === "swing" ? "Add Swing Song" : "Add Song"}
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-2xl bg-card">
              <DialogHeader>
                <DialogTitle className="font-display text-xl text-primary">
                  {editingSong ? "Edit Song" : activeTab === "swing" ? "Add Swing Song" : "Add Line Dance"}
                </DialogTitle>
              </DialogHeader>
              {isSwingEditing || (!editingSong && activeTab === "swing")
                ? <SwingSongForm initialData={editingSong} onClose={() => setIsSongDialogOpen(false)} />
                : <LineSongForm initialData={editingSong} onClose={() => setIsSongDialogOpen(false)} />
              }
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search bar + sort toggle */}
      <div className="flex items-center gap-2 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="Search dances, songs, or artists..."
            className="pl-10 h-12 rounded-xl bg-card border-border shadow-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            data-testid="input-library-search"
          />
        </div>
        <Button
          size="icon"
          variant="outline"
          className="h-12 w-12 rounded-xl border-2 flex-shrink-0"
          onClick={() => setSortBy(prev => prev === "song" ? "dance" : "song")}
          title={sortBy === "song" ? "Sorted by song name — click to sort by dance name" : "Sorted by dance name — click to sort by song name"}
          data-testid="button-sort-toggle"
        >
          {sortBy === "song" ? <Music className="w-5 h-5" /> : <Footprints className="w-5 h-5" />}
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full bg-secondary/40 rounded-xl mb-6">
          <TabsTrigger value="linedance" className="flex-1 rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm">
            Line Dance <span className="ml-1.5 text-xs bg-primary/15 text-primary rounded-full px-1.5">{lineSongs.length}</span>
          </TabsTrigger>
          <TabsTrigger value="swing" className="flex-1 rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm">
            Swing <span className="ml-1.5 text-xs bg-blue-500/15 text-blue-600 rounded-full px-1.5">{swingSongs.length}</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="linedance" className="space-y-3">
          {isLoading ? (
            <div className="text-center py-10 text-muted-foreground">Loading library...</div>
          ) : lineSongs.length === 0 ? (
            <div className="text-center py-16 bg-secondary/20 rounded-2xl border-2 border-dashed border-border">
              <Music className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
              <p className="font-medium text-lg">No line dances found</p>
              <p className="text-muted-foreground text-sm">Add some to get started!</p>
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              {lineSongs.map(song => (
                <SongCard key={song.id} song={song} sessions={sessions} sortBy={sortBy}
                  onFavorite={() => toggleFavorite.mutate(song.id)}
                  onEdit={() => { setEditingSong(song); setIsSongDialogOpen(true); }}
                  onDelete={() => handleDelete(song.id)} />
              ))}
            </AnimatePresence>
          )}
        </TabsContent>

        <TabsContent value="swing" className="space-y-3">
          {isLoading ? (
            <div className="text-center py-10 text-muted-foreground">Loading library...</div>
          ) : swingSongs.length === 0 ? (
            <div className="text-center py-16 bg-secondary/20 rounded-2xl border-2 border-dashed border-border">
              <Music className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
              <p className="font-medium text-lg">No swing songs yet</p>
              <p className="text-muted-foreground text-sm">Add WCS, ECS, Country Swing, Two-Step, and more!</p>
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              {swingSongs.map(song => (
                <SongCard key={song.id} song={song} sessions={sessions} sortBy={sortBy}
                  onFavorite={() => toggleFavorite.mutate(song.id)}
                  onEdit={() => { setEditingSong(song); setIsSongDialogOpen(true); }}
                  onDelete={() => handleDelete(song.id)} />
              ))}
            </AnimatePresence>
          )}
        </TabsContent>
      </Tabs>

      <LocationsDialog open={isLocationsDialogOpen} onOpenChange={setIsLocationsDialogOpen} />
    </div>
  );
}
