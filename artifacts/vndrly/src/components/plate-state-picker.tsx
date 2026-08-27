import * as React from "react";
import {
  orderPlateStates,
  US_PLATE_STATES,
  type PlateStateCode,
} from "@workspace/plate-state";
import { Check, ChevronsUpDown } from "lucide-react";

import { Button } from "@/components/ui/button";
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

  const selectState = (state: PlateStateCode) => {
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
            aria-haspopup="listbox"
            aria-label={triggerLabel}
            aria-invalid={error ? true : undefined}
            className={cn(
              "w-full justify-between font-normal",
              error && "border-destructive",
            )}
            disabled={disabled}
            role="combobox"
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
          <input
            aria-label="Search plate states"
            className="mb-2 flex h-10 w-full rounded-md border bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search states"
            role="searchbox"
            type="search"
            value={query}
          />
          <div aria-label="Plate state options" className="max-h-72 overflow-y-auto" role="listbox">
            {states.map((state) => {
              const isSelected = state.code === value;
              return (
                <button
                  aria-selected={isSelected}
                  className="flex min-h-10 w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm outline-none hover:bg-accent focus-visible:bg-accent"
                  key={state.code}
                  onClick={() => selectState(state.code)}
                  role="option"
                  type="button"
                >
                  <Check
                    aria-hidden="true"
                    className={cn("size-4", isSelected ? "opacity-100" : "opacity-0")}
                  />
                  {state.name} ({state.code})
                </button>
              );
            })}
          </div>
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
