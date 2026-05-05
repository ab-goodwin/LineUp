import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check, ChevronsUpDown, MapPin, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocations, useCreateLocation } from "@/hooks/use-locations";

interface LocationComboboxProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function LocationCombobox({ value, onChange, placeholder = "Select or type a location..." }: LocationComboboxProps) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const { data: locations = [] } = useLocations();
  const createLocation = useCreateLocation();

  const filtered = locations.filter(l =>
    l.name.toLowerCase().includes(inputValue.toLowerCase())
  );

  const exactMatch = locations.some(l => l.name.toLowerCase() === inputValue.toLowerCase());
  const showAddOption = inputValue.trim().length > 0 && !exactMatch;

  const handleSelect = (name: string) => {
    onChange(name);
    setInputValue("");
    setOpen(false);
  };

  const handleAddNew = async () => {
    const name = inputValue.trim();
    if (!name) return;
    await createLocation.mutateAsync(name);
    onChange(name);
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
          <Command>
            <CommandInput
              placeholder="Search or type new location..."
              value={inputValue}
              onValueChange={setInputValue}
              data-testid="input-location-search"
            />
            <CommandList>
              {filtered.length === 0 && !showAddOption && (
                <CommandEmpty className="py-4 text-center text-sm text-muted-foreground">
                  No saved locations. Type to add one.
                </CommandEmpty>
              )}
              {filtered.length > 0 && (
                <CommandGroup className="bg-[#ffffff]">
                  {filtered.map(loc => (
                    <CommandItem
                      key={loc.id}
                      value={loc.name}
                      onSelect={() => handleSelect(loc.name)}
                      data-testid={`location-option-${loc.id}`}
                    >
                      <Check className={cn("mr-2 w-4 h-4", value === loc.name ? "opacity-100" : "opacity-0")} />
                      {loc.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
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
