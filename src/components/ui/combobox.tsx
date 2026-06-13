/**
 * Combobox — generic, controlled, single-select searchable combobox.
 *
 * Follows WCAG 2.2 AA + ARIA 1.2 combobox pattern (pattern 3.1):
 *   - Input has role="combobox", aria-expanded, aria-controls, aria-autocomplete, aria-activedescendant
 *   - Listbox has role="listbox"
 *   - Each option has role="option", aria-selected, unique id
 *
 * No useMemo/useCallback — React Compiler is ON.
 */

import { useState, useId, useRef, useEffect } from "react";
import type React from "react";
import { cn } from "@/lib/utils";

export interface ComboboxOption {
  value: string;
  label: string;
}

export interface ComboboxProps {
  id?: string;
  options: ComboboxOption[];
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  disabled?: boolean;
  "aria-label"?: string;
  ref?: React.Ref<HTMLInputElement>;
}

function Combobox({
  id,
  options,
  value,
  onChange,
  onBlur,
  placeholder = "Seleccioná una opción…",
  disabled = false,
  "aria-label": ariaLabel,
  ref,
}: ComboboxProps) {
  const uid = useId();
  const listboxId = `${uid}-listbox`;

  // The label of the currently selected option (empty string if nothing selected)
  const selectedLabel = options.find((o) => o.value === value)?.label ?? "";

  // Query shown in the input while open; null means closed
  const [query, setQuery] = useState<string | null>(null);
  const isOpen = query !== null;

  const [activeIndex, setActiveIndex] = useState<number>(-1);

  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cancel any pending blur-close timer on unmount
  useEffect(() => {
    return () => {
      if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
    };
  }, []);

  // Normalize accents for matching so "cal" matches "Cálculo"
  function normalize(s: string) {
    // NFD decomposes accented chars; strip Unicode combining diacritical marks
    return s.toLowerCase().normalize("NFD").replace(/\p{Mn}/gu, "");
  }

  const filteredOptions = isOpen
    ? options.filter((o) =>
        normalize(o.label).includes(normalize(query ?? ""))
      )
    : options;

  function openDropdown() {
    if (disabled) return;
    // Open with empty query so all options are visible; user types to narrow
    setQuery("");
    setActiveIndex(-1);
  }

  function closeDropdown() {
    setQuery(null);
    setActiveIndex(-1);
  }

  function selectOption(option: ComboboxOption) {
    onChange(option.value);
    closeDropdown();
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    setQuery(e.target.value);
    setActiveIndex(-1);
  }

  function handleInputFocus() {
    if (!isOpen) {
      openDropdown();
    }
  }

  function handleInputBlur() {
    // Cancel any stale close timer before scheduling a new one
    if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
    // Delay so that option click registers before closing
    blurTimeoutRef.current = setTimeout(() => {
      closeDropdown();
      onBlur?.();
    }, 150);
  }

  function handleOptionMouseDown(e: React.MouseEvent) {
    // Prevent blur from firing before the click
    e.preventDefault();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!isOpen) {
      // When closed: ArrowDown opens the dropdown. Enter propagates freely so form can submit.
      if (e.key === "ArrowDown") {
        openDropdown();
        e.preventDefault();
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown": {
        e.preventDefault();
        const next = activeIndex < filteredOptions.length - 1 ? activeIndex + 1 : 0;
        setActiveIndex(next);
        break;
      }
      case "ArrowUp": {
        e.preventDefault();
        const prev = activeIndex > 0 ? activeIndex - 1 : filteredOptions.length - 1;
        setActiveIndex(prev);
        break;
      }
      case "Home": {
        e.preventDefault();
        setActiveIndex(0);
        break;
      }
      case "End": {
        e.preventDefault();
        setActiveIndex(filteredOptions.length - 1);
        break;
      }
      case "Enter": {
        e.preventDefault();
        if (activeIndex >= 0) {
          // User navigated to an option — select it.
          const opt = filteredOptions[activeIndex];
          if (opt) selectOption(opt);
        } else {
          // No active option — close without selecting (prevents accidental submit while popup is open).
          closeDropdown();
        }
        break;
      }
      case "Escape": {
        e.preventDefault();
        closeDropdown();
        break;
      }
    }
  }

  // The value shown in the input
  const inputValue = isOpen ? (query ?? "") : selectedLabel;

  // Active option id for aria-activedescendant
  const activeOptionId =
    isOpen && activeIndex >= 0 && activeIndex < filteredOptions.length
      ? `${uid}-opt-${activeIndex}`
      : undefined;

  return (
    <div className="relative">
      <input
        id={id}
        ref={ref}
        role="combobox"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        aria-autocomplete="list"
        aria-activedescendant={activeOptionId}
        autoComplete="off"
        disabled={disabled}
        placeholder={placeholder}
        value={inputValue}
        onChange={handleInputChange}
        onFocus={handleInputFocus}
        onBlur={handleInputBlur}
        onKeyDown={handleKeyDown}
        className={cn(
          "border rounded px-2 py-1.5 text-sm bg-background text-foreground w-full",
          "focus:outline-none focus:ring-1 focus:ring-primary",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          selectedLabel && !isOpen && "font-medium"
        )}
      />

      {isOpen && (
        <ul
          id={listboxId}
          role="listbox"
          className={cn(
            "absolute z-10 w-full border rounded bg-background shadow-md mt-1",
            "max-h-48 overflow-y-auto"
          )}
        >
          {filteredOptions.length === 0 ? (
            <li role="option" aria-disabled="true" aria-selected={false} className="px-2 py-1.5 text-sm text-muted-foreground select-none">
              Sin resultados
            </li>
          ) : (
            filteredOptions.map((opt, idx) => (
              <li
                key={opt.value}
                id={`${uid}-opt-${idx}`}
                role="option"
                aria-selected={opt.value === value}
                onMouseDown={handleOptionMouseDown}
                onClick={() => selectOption(opt)}
                className={cn(
                  "px-2 py-1.5 text-sm cursor-pointer",
                  opt.value === value && "font-medium",
                  idx === activeIndex
                    ? "bg-primary/10 text-primary"
                    : "hover:bg-muted/40"
                )}
              >
                {opt.label}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}

export { Combobox };
