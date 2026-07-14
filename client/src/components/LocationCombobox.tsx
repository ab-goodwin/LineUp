import { useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Check,
  ChevronsUpDown,
  Clock3,
  Loader2,
  MapPin,
  Plus,
  Star,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  type LocationOption,
  useCreateLocation,
  useLocations,
  useLocationSearch,
} from "@/hooks/use-locations";
import type { NormalizedPlace } from "@shared/schema";

interface LocationComboboxProps {
  value: string;
  onChange: (value: string) => void;

  /**
   * Use this callback to save the selected global location ID into the session.
   */
  onSelectLocationId?: (locationId: number | null) => void;

  /**
   * Kept temporarily for compatibility with the former provider-based flow.
   * Global locations are not provider places, so this receives null.
   */
  onSelectPlace?: (place: NormalizedPlace | null) => void;

  placeholder?: string;
}

function subtitle(location: LocationOption): string | null {
  const parts = [location.city, location.state].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : null;
}

export function LocationCombobox({
  value,
  onChange,
  onSelectLocationId,
  onSelectPlace,
  placeholder = "Select or type a location...",
}: LocationComboboxProps) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");

  const trimmedInput = inputValue.trim();
  const isSearching = trimmedInput.length > 0;

  const { data: savedAndRecent = [], isLoading: isLoadingSaved } =
    useLocations(6);
  const globalSearch = useLocationSearch(trimmedInput, 6);
  const createLocation = useCreateLocation();

  const searchResults = (globalSearch.data?.results ?? []).slice(0, 6);

  const favorites = savedAndRecent.filter((location) => location.isFavorite);
  const favoriteIds = new Set(favorites.map((location) => location.id));
  const recent = savedAndRecent.filter(
    (location) => !favoriteIds.has(location.id) && location.lastUsedAt,
  );

  const normalizedInput = trimmedInput.toLocaleLowerCase();
  const exactMatch = searchResults.some(
    (location) => location.name.trim().toLocaleLowerCase() === normalizedInput,
  );

  const showAddOption = isSearching && !exactMatch;

  function selectLocation(location: LocationOption) {
    onChange(location.name);
    onSelectLocationId?.(location.id);
    onSelectPlace?.(null);
    setInputValue("");
    setOpen(false);
  }

  async function handleAddNew() {
    if (!trimmedInput) return;

    const location = await createLocation.mutateAsync({
      name: trimmedInput,
    });

    selectLocation(location);
  }

  const showEmptySavedState =
    !isSearching &&
    !isLoadingSaved &&
    favorites.length === 0 &&
    recent.length === 0;

  const showNoSearchResults =
    isSearching &&
    !globalSearch.isFetching &&
    searchResults.length === 0;

  return (
    <div className={cn("relative", open && "z-[100]")}>
      <Popover open={open} onOpenChange={setOpen} modal={false}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="h-10 w-full justify-between rounded-xl border-2 font-normal focus-visible:ring-primary/20"
            data-testid="button-location-combobox"
          >
            <span
              className={cn(
                "flex min-w-0 items-center gap-2 truncate",
                !value && "text-muted-foreground",
              )}
            >
              <MapPin className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
              <span className="truncate">{value || placeholder}</span>
            </span>

            <ChevronsUpDown className="h-4 w-4 flex-shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>

        <PopoverContent
          className="w-[--radix-popover-trigger-width] rounded-xl p-0 !z-[9999]"
          align="start"
          sideOffset={4}
        >
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Search global locations..."
              value={inputValue}
              onValueChange={setInputValue}
              data-testid="input-location-search"
            />

            <CommandList>
              {!isSearching && isLoadingSaved && (
                <div className="flex items-center justify-center gap-2 py-4 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Loading locations…
                </div>
              )}

              {showEmptySavedState && (
                <CommandEmpty className="py-4 text-center text-sm text-muted-foreground">
                  No favorite or recent locations yet. Type to search the global
                  list.
                </CommandEmpty>
              )}

              {!isSearching && favorites.length > 0 && (
                <CommandGroup heading="Favorites">
                  {favorites.map((location) => (
                    <CommandItem
                      key={`favorite-${location.id}`}
                      value={`favorite-${location.id}`}
                      onSelect={() => selectLocation(location)}
                      data-testid={`location-option-${location.id}`}
                    >
                      <Star className="mr-2 h-4 w-4 flex-shrink-0 text-primary" />

                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium">{location.name}</div>
                        {subtitle(location) && (
                          <div className="truncate text-xs text-muted-foreground">
                            {subtitle(location)}
                          </div>
                        )}
                      </div>

                      <Check
                        className={cn(
                          "ml-2 h-4 w-4",
                          value === location.name ? "opacity-100" : "opacity-0",
                        )}
                      />
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              {!isSearching && recent.length > 0 && (
                <CommandGroup heading="Recent">
                  {recent.map((location) => (
                    <CommandItem
                      key={`recent-${location.id}`}
                      value={`recent-${location.id}`}
                      onSelect={() => selectLocation(location)}
                      data-testid={`location-option-${location.id}`}
                    >
                      <Clock3 className="mr-2 h-4 w-4 flex-shrink-0 text-muted-foreground" />

                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium">{location.name}</div>
                        {subtitle(location) && (
                          <div className="truncate text-xs text-muted-foreground">
                            {subtitle(location)}
                          </div>
                        )}
                      </div>

                      <Check
                        className={cn(
                          "ml-2 h-4 w-4",
                          value === location.name ? "opacity-100" : "opacity-0",
                        )}
                      />
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              {isSearching && globalSearch.isFetching && (
                <div className="flex items-center justify-center gap-2 py-3 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Searching global locations…
                </div>
              )}

              {isSearching && searchResults.length > 0 && (
                <CommandGroup heading="Global Locations">
                  {searchResults.map((location) => (
                    <CommandItem
                      key={`global-${location.id}`}
                      value={`global-${location.id}`}
                      onSelect={() => selectLocation(location)}
                      data-testid={`location-option-${location.id}`}
                    >
                      <MapPin className="mr-2 h-4 w-4 flex-shrink-0 text-primary" />

                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium">{location.name}</div>
                        {subtitle(location) && (
                          <div className="truncate text-xs text-muted-foreground">
                            {subtitle(location)}
                          </div>
                        )}
                      </div>

                      {location.isFavorite && (
                        <Star className="ml-2 h-4 w-4 flex-shrink-0 text-primary" />
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              {showNoSearchResults && (
                <div className="px-3 py-4 text-center text-sm text-muted-foreground">
                  No Locations Found.
                </div>
              )}

              {showAddOption && (
                <CommandGroup>
                  <CommandItem
                    value={`__add__${trimmedInput}`}
                    onSelect={handleAddNew}
                    className="text-primary"
                    disabled={createLocation.isPending}
                    data-testid="button-add-location-inline"
                  >
                    {createLocation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="mr-2 h-4 w-4" />
                    )}
                    Add “{trimmedInput}”
                  </CommandItem>
                </CommandGroup>
              )}

              {createLocation.isError && (
                <div className="px-3 pb-3 text-xs text-destructive">
                  {createLocation.error.message}
                </div>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}