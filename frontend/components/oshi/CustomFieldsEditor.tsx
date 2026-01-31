"use client";

import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { CustomField } from "@/lib/uiTypes";

export default function CustomFieldsEditor({
  value,
  onChange,
}: {
  value: CustomField[];
  onChange: (next: CustomField[]) => void;
}) {
  const updateItem = (index: number, patch: Partial<CustomField>) => {
    onChange(value.map((item, idx) => (idx === index ? { ...item, ...patch } : item)));
  };

  const addItem = () => {
    onChange([...value, { key: "", value: "" }]);
  };

  const removeItem = (index: number) => {
    onChange(value.filter((_, idx) => idx !== index));
  };

  return (
    <div className="space-y-3">
      {value.map((item, index) => (
        <div key={`${item.key}-${index}`} className="space-y-2 rounded-xl border p-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>カスタム {index + 1}</span>
            <Button variant="ghost" size="icon" onClick={() => removeItem(index)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
          <Input
            placeholder="項目名"
            value={item.key}
            onChange={(event) => updateItem(index, { key: event.target.value })}
          />
          <Input
            placeholder="内容"
            value={item.value}
            onChange={(event) => updateItem(index, { value: event.target.value })}
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
