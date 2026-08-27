import * as React from "react";
import {
  orderPlateStates,
  US_PLATE_STATES,
  type PlateStateCode,
} from "@workspace/plate-state";
import { Check, ChevronsUpDown } from "lucide-react";

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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export interface PlateStatePickerProps {
  value: PlateStateCode | null;
  onChange: (state: PlateStateCode) => void;
  preferredStates: readonly (PlateStateCode | string | null | undefined)[];
  disabled?: boolean;
  error?: string;
}

const selectLabel = "Select plate state";

export function PlateStatePicker({
  value,
  onChange,
  preferredStates,
  disabled = false,
  error,
}: PlateStatePickerProps) {
  const errorId = React.useId();
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const selectedState = React.useMemo(
    () => US_PLATE_STATES.find((state) => state.code === value) ?? null,
    [value],
  );
  const states = React.useMemo(
    () => orderPlateStates(preferredStates, query),
    [preferredStates, query],
  );
  const triggerLabel = selectedState
    ? `Selected plate state: ${selectedState.name} (${selectedState.code})`
    : selectLabel;

  React.useEffect(() => {
    if (disabled) {
      setOpen(false);
      setQuery("");
    }
  }, [disabled]);

  const selectState = (state: PlateStateCode) => {
    if (disabled) return;
    onChange(state);
    setOpen(false);
    setQuery("");
  };

  return (
    <div className="space-y-1.5">
      <Popover
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen);
          if (!nextOpen) setQuery("");
        }}
        open={open}
      >
        <PopoverTrigger asChild>
          <Button
            aria-describedby={error ? errorId : undefined}
            aria-expanded={open}
            aria-haspopup="dialog"
            aria-label={triggerLabel}
            aria-invalid={error ? true : undefined}
            className={cn(
              "w-full justify-between font-normal",
              error && "border-destructive",
            )}
            disabled={disabled}
            type="button"
            variant="outline"
          >
            <span>{selectedState ? `${selectedState.name} (${selectedState.code})` : selectLabel}</span>
            <ChevronsUpDown aria-hidden="true" className="size-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          aria-label="Plate state picker"
          className="w-[var(--radix-popover-trigger-width)] p-2"
          role="dialog"
        >
          <Command label="Search plate states" loop shouldFilter={false}>
            <CommandInput
              aria-label="Search plate states"
              onValueChange={setQuery}
              placeholder="Search states"
              value={query}
            />
            <CommandList>
              <CommandEmpty>No states found.</CommandEmpty>
              <CommandGroup>
                {states.map((state) => {
                  const isSelected = state.code === value;
                  return (
                    <CommandItem
                      aria-selected={isSelected}
                      key={state.code}
                      onSelect={() => selectState(state.code)}
                      role="option"
                      value={`${state.name} ${state.code}`}
                    >
                      <Check
                        aria-hidden="true"
                        className={cn("size-4", isSelected ? "opacity-100" : "opacity-0")}
                      />
                      {state.name} ({state.code})
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {error ? (
        <p className="text-sm text-destructive" id={errorId} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export default PlateStatePicker;
