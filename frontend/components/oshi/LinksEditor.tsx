"use client";

import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { OshiLink } from "@/lib/uiTypes";

export default function LinksEditor({
  value,
  onChange,
}: {
  value: OshiLink[];
  onChange: (next: OshiLink[]) => void;
}) {
  const updateItem = (index: number, patch: Partial<OshiLink>) => {
    onChange(value.map((item, idx) => (idx === index ? { ...item, ...patch } : item)));
  };

  const addItem = () => {
    onChange([...value, { label: "", url: "" }]);
  };

  const removeItem = (index: number) => {
    onChange(value.filter((_, idx) => idx !== index));
  };

  return (
    <div className="space-y-3">
      {value.map((item, index) => (
        <div key={`${item.label}-${index}`} className="space-y-2 rounded-xl border p-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>リンク {index + 1}</span>
            <Button variant="ghost" size="icon" onClick={() => removeItem(index)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
          <Input
            placeholder="ラベル（例：公式X）"
            value={item.label}
            onChange={(event) => updateItem(index, { label: event.target.value })}
          />
          <Input
            placeholder="https://..."
            value={item.url}
            onChange={(event) => updateItem(index, { url: event.target.value })}
          />
        </div>
      ))}
      <Button type="button" variant="secondary" size="sm" onClick={addItem}>
        <Plus className="mr-2 h-4 w-4" />
        追加
      </Button>
    </div>
  );
}
