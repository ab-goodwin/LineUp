import { useState, useRef, useEffect } from "react";
import { FadeImg } from "@/components/FadeImg";
import { Input } from "@/components/ui/input";
import { Search, Music, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface SpotifyTrack {
  name: string;
  artist: string;
  albumArt?: string;
}

interface SpotifySearchProps {
  onSelect: (track: SpotifyTrack) => void;
  placeholder?: string;
  className?: string;
  initialQuery?: string;
}

export function SpotifySearch({ onSelect, placeholder = "Search Spotify for a song...", className, initialQuery }: SpotifySearchProps) {
  const [query, setQuery] = useState(initialQuery ?? "");
  const [results, setResults] = useState<SpotifyTrack[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Trigger initial search if initialQuery is provided
  useEffect(() => {
    if (initialQuery && initialQuery.trim()) {
      search(initialQuery);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const search = async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      setIsOpen(false);
      return;
    }
    setIsSearching(true);
    setError(null);
    try {
      const res = await fetch(`/api/spotify/search?q=${encodeURIComponent(q)}`, {
        credentials: "include",
      });
      if (res.status === 503) {
        setError("Spotify not configured");
        setResults([]);
        setIsOpen(false);
        return;
      }
      if (!res.ok) throw new Error("Search failed");
      const data = await res.json();
      setResults(data);
      setIsOpen(true);
    } catch (err) {
      setError("Search failed");
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(val), 400);
  };

  const handleSelect = (track: SpotifyTrack) => {
    onSelect(track);
    setQuery(track.name);
    setIsOpen(false);
    setResults([]);
  };

  const handleClear = () => {
    setQuery("");
    setResults([]);
    setIsOpen(false);
    setError(null);
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
          <svg viewBox="0 0 24 24" className="w-4 h-4 fill-[#1DB954]" aria-label="Spotify">
            <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
          </svg>
          {isSearching ? (
            <Loader2 className="w-3.5 h-3.5 text-muted-foreground animate-spin" />
          ) : (
            <Search className="w-3.5 h-3.5 text-muted-foreground" />
          )}
        </div>
        <Input
          data-testid="input-spotify-search"
          placeholder={placeholder}
          value={query}
          onChange={handleChange}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          className="pl-14 pr-8 rounded-xl"
        />
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {error && (
        <p className="text-xs text-muted-foreground mt-1 pl-1">{error === "Spotify not configured" ? "Spotify search unavailable — enter song name manually" : "Search failed, try again"}</p>
      )}

      {isOpen && results.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-xl shadow-lg max-h-56 overflow-y-auto">
          {results.map((track, i) => (
            <button
              key={i}
              type="button"
              data-testid={`spotify-result-${i}`}
              onClick={() => handleSelect(track)}
              className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-secondary/60 transition-colors text-left first:rounded-t-xl last:rounded-b-xl"
            >
              {track.albumArt ? (
                <FadeImg src={track.albumArt} alt="" className="w-9 h-9 rounded object-cover flex-shrink-0" />
              ) : (
                <div className="w-9 h-9 rounded bg-secondary flex items-center justify-center flex-shrink-0">
                  <Music className="w-4 h-4 text-muted-foreground" />
                </div>
              )}
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{track.name}</p>
                <p className="text-xs text-muted-foreground truncate">{track.artist}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
