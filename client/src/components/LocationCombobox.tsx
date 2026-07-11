import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check, ChevronsUpDown, MapPin, Plus, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocations, useCreateLocation, usePlaceSearch } from "@/hooks/use-locations";
import type { NormalizedPlace } from "@shared/schema";

interface LocationComboboxProps {
  value: string;
  onChange: (value: string) => void;
  onSelectPlace?: (place: NormalizedPlace | null) => void;
  placeholder?: string;
}

export function LocationCombobox({ value, onChange, onSelectPlace, placeholder = "Select or type a location..." }: LocationComboboxProps) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const { data: locations = [] } = useLocations();
  const createLocation = useCreateLocation();
  const placeSearch = usePlaceSearch(inputValue);

  const filtered = locations
  .filter(l => l.name.toLowerCase().includes(inputValue.toLowerCase()))
  .slice(0, 6);

  const exactMatch = locations.some(l => l.name.toLowerCase() === inputValue.toLowerCase());
  const showAddOption = inputValue.trim().length > 0 && !exactMatch;

  const providerConfigured = placeSearch.data?.configured ?? false;
  const placeResults = (placeSearch.data?.results ?? []).slice(0, 6);

  const handleSelect = (name: string) => {
    onChange(name);
    onSelectPlace?.(null);
    setInputValue("");
    setOpen(false);
  };

  const handleSelectPlace = (place: NormalizedPlace) => {
    onChange(place.name);
    onSelectPlace?.(place);
    setInputValue("");
    setOpen(false);
  };

  const handleAddNew = async () => {
    const name = inputValue.trim();
    if (!name) return;
    await createLocation.mutateAsync(name);
    onChange(name);
    onSelectPlace?.(null);
    setInputValue("");
    setOpen(false);
  };

  return (
    <div className={cn("relative", open && "z-[100]")}>
      <Popover open={open} onOpenChange={setOpen} modal={false}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between rounded-xl border-2 font-normal h-10 focus-visible:ring-primary/20"
            data-testid="button-location-combobox"
          >
            <span className={cn("flex items-center gap-2 truncate", !value && "text-muted-foreground")}>
              <MapPin className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
              {value || placeholder}
            </span>
            <ChevronsUpDown className="w-4 h-4 flex-shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[--radix-popover-trigger-width] p-0 rounded-xl !z-[9999]"
          align="start"
          sideOffset={4}
        >
          <Command shouldFilter={false}>
            <CommandInput
              placeholder={providerConfigured ? "Search places or type a location..." : "Search or type new location..."}
              value={inputValue}
              onValueChange={setInputValue}
              data-testid="input-location-search"
            />
            <CommandList>
              {filtered.length === 0 && placeResults.length === 0 && !showAddOption && (
                <CommandEmpty className="py-4 text-center text-sm text-muted-foreground">
                  No saved locations. Type to add one.
                </CommandEmpty>
              )}
              {filtered.length > 0 && (
                <CommandGroup heading="Saved" className="bg-[#ffffff]">
                  {filtered.map(loc => (
                    <CommandItem
                      key={loc.id}
                      value={`saved-${loc.id}`}
                      onSelect={() => handleSelect(loc.name)}
                      data-testid={`location-option-${loc.id}`}
                    >
                      <Check className={cn("mr-2 w-4 h-4", value === loc.name ? "opacity-100" : "opacity-0")} />
                      {loc.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              {providerConfigured && placeResults.length > 0 && (
                <CommandGroup heading="Places">
                  {placeResults.map(place => (
                    <CommandItem
                      key={`${place.provider}-${place.placeId}`}
                      value={`place-${place.provider}-${place.placeId}`}
                      onSelect={() => handleSelectPlace(place)}
                      data-testid={`place-option-${place.placeId}`}
                    >
                      <MapPin className="mr-2 w-4 h-4 flex-shrink-0 text-primary" />
                      <div className="flex flex-col min-w-0">
                        <span className="truncate font-medium">{place.name}</span>
                        {place.formattedAddress && (
                          <span className="truncate text-xs text-muted-foreground">{place.formattedAddress}</span>
                        )}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              {providerConfigured && placeSearch.isFetching && (
                <div className="flex items-center justify-center gap-2 py-3 text-xs text-muted-foreground">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Searching places…
                </div>
              )}
              {showAddOption && (
                <CommandGroup>
                  <CommandItem
                    value={`__add__${inputValue}`}
                    onSelect={handleAddNew}
                    className="text-primary"
                    data-testid="button-add-location-inline"
                  >
                    <Plus className="mr-2 w-4 h-4" />
                    Add "{inputValue.trim()}"
                  </CommandItem>
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
