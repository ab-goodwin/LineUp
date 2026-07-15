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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
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
  LocationApiError,
  type LocationDuplicate,
  type LocationOption,
  useCreateLocation,
  useLocations,
  useLocationSearch,
} from "@/hooks/use-locations";

interface LocationComboboxProps {
  value: string;
  onChange: (value: string) => void;
  onSelectLocationId?: (locationId: number | null) => void;
  placeholder?: string;
}

function getLocationSubtitle(
  location: Pick<LocationOption, "city" | "state">,
): string | null {
  const parts = [location.city, location.state].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : null;
}

export function LocationCombobox({
  value,
  onChange,
  onSelectLocationId,
  placeholder = "Select or type a location...",
}: LocationComboboxProps) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newLocation, setNewLocation] = useState({
    name: "",
    city: "",
    state: "",
  });
  const [duplicates, setDuplicates] = useState<LocationDuplicate[]>([]);
  const [addError, setAddError] = useState("");

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

  function selectLocation(location: LocationOption | LocationDuplicate) {
    onChange(location.name);
    onSelectLocationId?.(location.id);

    setInputValue("");
    setOpen(false);
    setAddDialogOpen(false);
    setDuplicates([]);
    setAddError("");
  }

  function openAddLocationDialog() {
    setNewLocation({
      name: trimmedInput,
      city: "",
      state: "",
    });
    setDuplicates([]);
    setAddError("");

    // Close the dropdown before opening the dialog.
    setOpen(false);
    setAddDialogOpen(true);
  }

  async function submitNewLocation(confirmCreate = false) {
    const name = newLocation.name.trim();
    const city = newLocation.city.trim();
    const state = newLocation.state.trim();

    if (!name || !city || !state) {
      setAddError("Location name, city, and state are required.");
      return;
    }

    setAddError("");

    try {
      const created = await createLocation.mutateAsync({
        name,
        city,
        state,
        confirmCreate,
      });

      selectLocation(created);
    } catch (error) {
      if (error instanceof LocationApiError && error.status === 409) {
        setDuplicates(error.duplicates);
        return;
      }

      setAddError(
        error instanceof Error ? error.message : "Could not add location.",
      );
    }
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
    <>
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
                <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="truncate">{value || placeholder}</span>
              </span>

              <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
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
                      >
                        <Star className="mr-2 h-4 w-4 shrink-0 text-primary" />

                        <div className="min-w-0 flex-1">
                          <div className="truncate font-medium">{location.name}</div>
                          {getLocationSubtitle(location) && (
                            <div className="truncate text-xs text-muted-foreground">
                              {getLocationSubtitle(location)}
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
                      >
                        <Clock3 className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />

                        <div className="min-w-0 flex-1">
                          <div className="truncate font-medium">{location.name}</div>
                          {getLocationSubtitle(location) && (
                            <div className="truncate text-xs text-muted-foreground">
                              {getLocationSubtitle(location)}
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
                      >
                        <MapPin className="mr-2 h-4 w-4 shrink-0 text-primary" />

                        <div className="min-w-0 flex-1">
                          <div className="truncate font-medium">{location.name}</div>
                          {getLocationSubtitle(location) && (
                            <div className="truncate text-xs text-muted-foreground">
                              {getLocationSubtitle(location)}
                            </div>
                          )}
                        </div>

                        {location.isFavorite && (
                          <Star className="ml-2 h-4 w-4 shrink-0 text-primary" />
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
                      onSelect={openAddLocationDialog}
                      className="text-primary"
                      data-testid="button-add-location-inline"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add “{trimmedInput}”
                    </CommandItem>
                  </CommandGroup>
                )}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      <Dialog
        open={addDialogOpen}
        onOpenChange={(nextOpen) => {
          setAddDialogOpen(nextOpen);

          if (!nextOpen) {
            setDuplicates([]);
            setAddError("");
          }
        }}
      >
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-display text-primary">
              Add Global Location
            </DialogTitle>
            <DialogDescription>
              This venue will be searchable by everyone using LineUp and added to
              your favorite locations.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <label className="block space-y-1">
              <span className="text-sm font-medium">Venue name</span>
              <Input
                value={newLocation.name}
                maxLength={120}
                onChange={(event) =>
                  setNewLocation((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                placeholder="Nashville Palace"
                data-testid="input-global-location-name"
              />
            </label>

            <label className="block space-y-1">
              <span className="text-sm font-medium">City</span>
              <Input
                value={newLocation.city}
                maxLength={80}
                onChange={(event) =>
                  setNewLocation((current) => ({
                    ...current,
                    city: event.target.value,
                  }))
                }
                placeholder="Nashville"
                data-testid="input-global-location-city"
              />
            </label>

            <label className="block space-y-1">
              <span className="text-sm font-medium">State</span>
              <Input
                value={newLocation.state}
                maxLength={40}
                onChange={(event) =>
                  setNewLocation((current) => ({
                    ...current,
                    state: event.target.value,
                  }))
                }
                placeholder="TN"
                data-testid="input-global-location-state"
              />
            </label>

            {duplicates.length > 0 && (
              <div className="rounded-xl border bg-secondary/30 p-3">
                <p className="mb-2 text-sm font-semibold">
                  Possible matches found
                </p>
                <p className="mb-3 text-xs text-muted-foreground">
                  Select an existing venue, or choose Add Anyway if yours is
                  different.
                </p>

                <div className="space-y-2">
                  {duplicates.map((location) => (
                    <Button
                      key={location.id}
                      type="button"
                      variant="outline"
                      className="h-auto w-full justify-start rounded-xl px-3 py-2 text-left"
                      onClick={() => selectLocation(location)}
                    >
                      <MapPin className="mr-2 h-4 w-4 shrink-0 text-primary" />

                      <span className="min-w-0">
                        <span className="block truncate font-medium">
                          {location.name}
                        </span>
                        {getLocationSubtitle(location) && (
                          <span className="block truncate text-xs text-muted-foreground">
                            {getLocationSubtitle(location)}
                          </span>
                        )}
                      </span>
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {addError && (
              <p className="text-sm text-destructive" role="alert">
                {addError}
              </p>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setAddDialogOpen(false)}
            >
              Cancel
            </Button>

            <Button
              type="button"
              disabled={createLocation.isPending}
              onClick={() => submitNewLocation(duplicates.length > 0)}
              data-testid="button-submit-global-location"
            >
              {createLocation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {duplicates.length > 0 ? "Add Anyway" : "Check & Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}