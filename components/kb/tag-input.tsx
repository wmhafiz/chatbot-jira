'use client';

import { useState, useRef, KeyboardEvent } from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X, Plus, Tag as TagIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TagInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  suggestions?: string[];
  maxTags?: number;
  className?: string;
  disabled?: boolean;
}

export function TagInput({
  value,
  onChange,
  placeholder = "Add tags...",
  suggestions = [],
  maxTags = 10,
  className,
  disabled = false
}: TagInputProps) {
  const [inputValue, setInputValue] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Parse tags from comma-separated string
  const tags = value ? value.split(',').map(tag => tag.trim()).filter(Boolean) : [];

  // Filter suggestions based on input and existing tags
  const filteredSuggestions = suggestions.filter(suggestion =>
    suggestion.toLowerCase().includes(inputValue.toLowerCase()) &&
    !tags.includes(suggestion)
  );

  const addTag = (tag: string) => {
    const trimmedTag = tag.trim();
    if (!trimmedTag || tags.includes(trimmedTag) || tags.length >= maxTags) {
      return;
    }

    const newTags = [...tags, trimmedTag];
    onChange(newTags.join(', '));
    setInputValue('');
    setShowSuggestions(false);
  };

  const removeTag = (tagToRemove: string) => {
    const newTags = tags.filter(tag => tag !== tagToRemove);
    onChange(newTags.join(', '));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      if (inputValue.trim()) {
        addTag(inputValue);
      }
    } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      // Remove last tag when backspace is pressed on empty input
      removeTag(tags[tags.length - 1]);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      inputRef.current?.blur();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    setShowSuggestions(newValue.length > 0 && filteredSuggestions.length > 0);
  };

  const handleInputFocus = () => {
    if (inputValue && filteredSuggestions.length > 0) {
      setShowSuggestions(true);
    }
  };

  const handleInputBlur = () => {
    // Delay hiding suggestions to allow clicking on them
    setTimeout(() => setShowSuggestions(false), 200);
  };

  return (
    <div className={cn("relative", className)}>
      {/* Tags Display */}
      <div className="flex flex-wrap gap-1 mb-2">
        {tags.map((tag, index) => (
          <Badge key={index} variant="secondary" className="text-sm">
            <TagIcon className="h-3 w-3 mr-1" />
            {tag}
            {!disabled && (
              <Button
                variant="ghost"
                size="sm"
                className="h-4 w-4 p-0 ml-1 hover:bg-transparent"
                onClick={() => removeTag(tag)}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </Badge>
        ))}
      </div>

      {/* Input Field */}
      <div className="relative">
        <Input
          ref={inputRef}
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          placeholder={tags.length >= maxTags ? `Maximum ${maxTags} tags` : placeholder}
          disabled={disabled || tags.length >= maxTags}
          className="pr-10"
        />
        
        {inputValue && !disabled && (
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
            onClick={() => addTag(inputValue)}
          >
            <Plus className="h-4 w-4" />
          </Button>
        )}

        {/* Suggestions Dropdown */}
        {showSuggestions && filteredSuggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-popover border rounded-md shadow-md max-h-40 overflow-y-auto">
            {filteredSuggestions.slice(0, 8).map((suggestion, index) => (
              <div
                key={index}
                className="px-3 py-2 text-sm cursor-pointer hover:bg-accent flex items-center gap-2"
                onClick={() => addTag(suggestion)}
              >
                <TagIcon className="h-3 w-3 text-muted-foreground" />
                {suggestion}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Helper Text */}
      <div className="flex items-center justify-between mt-1">
        <p className="text-xs text-muted-foreground">
          Press Enter or comma to add tags
        </p>
        <p className="text-xs text-muted-foreground">
          {tags.length}/{maxTags} tags
        </p>
      </div>
    </div>
  );
}

// Simplified version that works with array of strings
interface SimpleTagInputProps {
  tags: string[];
  onTagsChange: (tags: string[]) => void;
  placeholder?: string;
  maxTags?: number;
  className?: string;
  disabled?: boolean;
}

export function SimpleTagInput({
  tags,
  onTagsChange,
  placeholder = "Add tags...",
  maxTags = 10,
  className,
  disabled = false
}: SimpleTagInputProps) {
  const [inputValue, setInputValue] = useState('');

  const addTag = (tag: string) => {
    const trimmedTag = tag.trim();
    if (!trimmedTag || tags.includes(trimmedTag) || tags.length >= maxTags) {
      return;
    }

    onTagsChange([...tags, trimmedTag]);
    setInputValue('');
  };

  const removeTag = (tagToRemove: string) => {
    onTagsChange(tags.filter(tag => tag !== tagToRemove));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      if (inputValue.trim()) {
        addTag(inputValue);
      }
    } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      {/* Tags Display */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {tags.map((tag, index) => (
            <Badge key={index} variant="secondary" className="text-sm">
              <TagIcon className="h-3 w-3 mr-1" />
              {tag}
              {!disabled && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 p-0 ml-1 hover:bg-transparent"
                  onClick={() => removeTag(tag)}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </Badge>
          ))}
        </div>
      )}

      {/* Input Field */}
      <div className="relative">
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={tags.length >= maxTags ? `Maximum ${maxTags} tags` : placeholder}
          disabled={disabled || tags.length >= maxTags}
          className="pr-10"
        />
        
        {inputValue && !disabled && (
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
            onClick={() => addTag(inputValue)}
          >
            <Plus className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Helper Text */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Press Enter or comma to add tags
        </p>
        <p className="text-xs text-muted-foreground">
          {tags.length}/{maxTags} tags
        </p>
      </div>
    </div>
  );
}