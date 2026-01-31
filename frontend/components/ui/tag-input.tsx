"use client";

import { useState } from "react";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

type TagInputProps = {
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
};

export default function TagInput({
  value,
  onChange,
  placeholder,
  className,
  disabled = false,
}: TagInputProps) {
  const [input, setInput] = useState("");

  const addTag = (raw: string) => {
    if (disabled) return;
    const next = raw.trim();
    if (!next) return;
    if (value.includes(next)) return;
    onChange([...value, next]);
    setInput("");
  };

  const removeTag = (tag: string) => {
    if (disabled) return;
    onChange(value.filter((item) => item !== tag));
  };

  return (
    <div className={cn("rounded-xl border border-input bg-background px-3 py-2", className)}>
      <div className="flex flex-wrap gap-2">
        {value.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
          >
            #{tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className="text-muted-foreground"
              disabled={disabled}
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === ",") {
              event.preventDefault();
              addTag(input);
            }
          }}
          onBlur={() => addTag(input)}
          placeholder={placeholder}
          className="min-w-[120px] flex-1 bg-transparent text-sm outline-none"
          disabled={disabled}
        />
      </div>
    </div>
  );
}
