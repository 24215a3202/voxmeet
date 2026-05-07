// ============================================
// Landing: Interest Tag Selector
// ============================================

'use client';

import { useState, useRef, KeyboardEvent } from 'react';
import { Pill } from '@/components/ui/Pill';
import { INTEREST_TAGS, MAX_INTERESTS } from '@/lib/constants';
import type { InterestTag } from '@voxmeet/types';

interface InterestSelectorProps {
  selected: string[];
  onChange: (interests: string[]) => void;
}

export function InterestSelector({ selected, onChange }: InterestSelectorProps) {
  const [customInput, setCustomInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const togglePreset = (tag: InterestTag) => {
    if (selected.includes(tag)) {
      onChange(selected.filter((t) => t !== tag));
    } else if (selected.length < MAX_INTERESTS) {
      onChange([...selected, tag]);
    }
  };

  const addCustom = () => {
    const trimmed = customInput.trim().toLowerCase();
    if (!trimmed || selected.includes(trimmed) || selected.length >= MAX_INTERESTS) return;
    onChange([...selected, trimmed]);
    setCustomInput('');
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addCustom();
    }
  };

  const atLimit = selected.length >= MAX_INTERESTS;

  return (
    <div className="w-full space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-vox-text-muted">
          Choose your interests
        </label>
        <span className={`text-xs font-medium transition-colors ${atLimit ? 'text-vox-primary' : 'text-vox-text-dim'}`}>
          {selected.length}/{MAX_INTERESTS} selected
        </span>
      </div>

      {/* Preset pills */}
      <div className="flex flex-wrap gap-2">
        {INTEREST_TAGS.map((tag) => (
          <Pill
            key={tag}
            label={tag}
            isActive={selected.includes(tag)}
            onClick={() => togglePreset(tag)}
            disabled={!selected.includes(tag) && atLimit}
          />
        ))}
      </div>

      {/* Custom interest input */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            ref={inputRef}
            type="text"
            placeholder={atLimit ? 'Limit reached — remove one first' : 'Add your own interest…'}
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={atLimit}
            maxLength={24}
            className="input-field text-sm w-full pr-10 disabled:opacity-50 disabled:cursor-not-allowed"
            id="custom-interest-input"
          />
          {customInput.trim() && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-vox-text-dim">
              ↵
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={addCustom}
          disabled={!customInput.trim() || atLimit}
          aria-label="Add custom interest"
          className="px-4 py-2 rounded-xl bg-vox-primary/10 border border-vox-primary/30 text-vox-primary text-sm font-medium
                     hover:bg-vox-primary/20 hover:border-vox-primary/50
                     active:scale-95 transition-all
                     disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-vox-primary/10"
          id="add-custom-interest-btn"
        >
          +
        </button>
      </div>

      {/* Selected tags (including custom ones) */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2 p-3 rounded-xl bg-vox-primary/5 border border-vox-primary/20 transition-all">
          {selected.map((tag) => (
            <Pill
              key={tag}
              label={tag}
              isActive
              removable
              onRemove={() => onChange(selected.filter((t) => t !== tag))}
            />
          ))}
        </div>
      )}
    </div>
  );
}
