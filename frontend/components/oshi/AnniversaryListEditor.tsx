"use client";

import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Anniversary } from "@/lib/uiTypes";

export default function AnniversaryListEditor({
  value,
  onChange,
}: {
  value: Anniversary[];
  onChange: (next: Anniversary[]) => void;
}) {
  const updateItem = (index: number, patch: Partial<Anniversary>) => {
    onChange(value.map((item, idx) => (idx === index ? { ...item, ...patch } : item)));
  };

  const addItem = () => {
    onChange([...value, { label: "", date: "", note: "" }]);
  };

  const removeItem = (index: number) => {
    onChange(value.filter((_, idx) => idx !== index));
  };

  return (
    <div className="space-y-3">
      {value.map((item, index) => (
        <div key={`${item.label}-${index}`} className="space-y-2 rounded-xl border p-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>記念日 {index + 1}</span>
            <Button variant="ghost" size="icon" onClick={() => removeItem(index)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
          <Input
            placeholder="ラベル（例：デビュー）"
            value={item.label}
            onChange={(event) => updateItem(index, { label: event.target.value })}
          />
          <Input
            type="date"
            value={item.date}
            onChange={(event) => updateItem(index, { date: event.target.value })}
          />
          <Textarea
            placeholder="メモ"
            rows={2}
            value={item.note ?? ""}
            onChange={(event) => updateItem(index, { note: event.target.value })}
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
