import { useState } from "react";
import { useSongs, useCreateSong, useUpdateSong, useDeleteSong } from "@/hooks/use-songs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertSongSchema } from "@shared/schema";
import { RatingStars } from "@/components/RatingStars";
import { Search, Plus, Music, Edit2, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

// Song Form Component
function SongForm({ initialData, onClose }: { initialData?: any; onClose: () => void }) {
  const createSong = useCreateSong();
  const updateSong = useUpdateSong();

  const form = useForm({
    resolver: zodResolver(insertSongSchema.omit({ publicId: true })),
    defaultValues: initialData || {
      danceName: "",
      songName: "",
      rating: 0,
    },
  });

  const onSubmit = async (values: any) => {
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
                <Input placeholder="e.g. Tush Push" className="rounded-xl" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="songName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Song Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Chattahoochee" className="rounded-xl" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="rating"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Rating</FormLabel>
              <FormControl>
                <div className="py-2">
                  <RatingStars 
                    rating={field.value} 
                    onRate={field.onChange} 
                    className="gap-2"
                  />
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
        >
          {initialData ? "Update Song" : "Add to Library"}
        </Button>
      </form>
    </Form>
  );
}

export default function Library() {
  const { data: songs = [], isLoading } = useSongs();
  const deleteSong = useDeleteSong();
  const [search, setSearch] = useState("");
  const [editingSong, setEditingSong] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const filteredSongs = songs
    .filter(s => 
      s.danceName.toLowerCase().includes(search.toLowerCase()) || 
      s.songName.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => a.danceName.localeCompare(b.danceName));

  const handleDelete = async (id: number) => {
    if (confirm("Are you sure? This will remove the song and affect stats.")) {
      await deleteSong.mutateAsync(id);
    }
  };

  return (
    <div className="container px-4 pb-24 pt-8 mx-auto max-w-4xl">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h1 className="text-3xl font-display font-bold">Song Library</h1>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              className="rounded-xl shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90 text-primary-foreground"
              onClick={() => setEditingSong(null)}
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
            <SongForm 
              initialData={editingSong} 
              onClose={() => setIsDialogOpen(false)} 
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input 
          placeholder="Search dances or songs..." 
          className="pl-10 h-12 rounded-xl bg-card border-border shadow-sm"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
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
              >
                <div className="flex-1 min-w-0 mr-4">
                  <h3 className="font-bold text-lg truncate font-display text-foreground">{song.danceName}</h3>
                  <p className="text-muted-foreground text-sm truncate">{song.songName}</p>
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
                      setIsDialogOpen(true);
                    }}
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    className="h-9 w-9 text-muted-foreground hover:text-destructive rounded-lg"
                    onClick={() => handleDelete(song.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
